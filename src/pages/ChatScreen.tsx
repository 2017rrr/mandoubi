import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Mic, Camera, Send, Play, Pause, Loader2 } from 'lucide-react';
import { getSignedUrl } from '@/utils/storageUtils';
import { useTranslation } from 'react-i18next';

interface Message {
  id: string;
  sender_id: string;
  sender_role: string;
  message_type: string;
  message: string | null;
  media_url: string | null;
  duration_seconds: number | null;
  created_at: string;
}

const ChatScreen = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [orderNumber, setOrderNumber] = useState<number>(0);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (!orderId) return;

    supabase.from('orders').select('order_number').eq('id', orderId).single().then(({ data }) => {
      if (data) setOrderNumber(data.order_number);
    });

    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
      if (data) setMessages(data as Message[]);
    };
    fetchMessages();

    const channel = supabase
      .channel(`chat-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  useEffect(() => {
    const resolveUrls = async () => {
      const mediaMessages = messages.filter(m => m.media_url && !signedUrls[m.id]);
      for (const msg of mediaMessages) {
        // الصور من السائق تُخزَّن في delivery-photos مع بادئة "delivery-photos/"، باقي الصور في chat-media
        const isDelivery = msg.media_url!.startsWith('delivery-photos/');
        const bucket = isDelivery ? 'delivery-photos' : 'chat-media';
        const path = isDelivery ? msg.media_url!.slice('delivery-photos/'.length) : msg.media_url!;
        const url = await getSignedUrl(bucket, path);
        if (url) setSignedUrls(prev => ({ ...prev, [msg.id]: url }));
      }
    };
    resolveUrls();
    scrollToBottom();
  }, [messages]);

  const notifyOtherParty = async (orderIdVal: string) => {
    try {
      const { data: order } = await supabase.from('orders').select('order_number, store_id, driver_id').eq('id', orderIdVal).single();
      if (!order || !user) return;
      const { data: store } = await supabase.from('stores').select('user_id').eq('id', order.store_id).single();
      const { data: driver } = order.driver_id ? await supabase.from('drivers').select('user_id').eq('id', order.driver_id).single() : { data: null };
      
      const recipients: string[] = [];
      if (store && store.user_id !== user.id) recipients.push(store.user_id);
      if (driver && driver.user_id !== user.id) recipients.push(driver.user_id);

      for (const recipientId of recipients) {
        await supabase.from('notifications').insert({
          user_id: recipientId,
          order_id: orderIdVal,
          type: 'new_message',
          title: t('chat.newMessage'),
          body: `${t('chat.newMessageBody')} #${order.order_number}`,
        });
      }
    } catch (e) {
      console.error('notifyOtherParty error:', e);
    }
  };

  const sendTextMessage = async () => {
    if (!text.trim() || !user || !profile || !orderId) return;
    const { error } = await supabase.from('messages').insert({
      order_id: orderId,
      sender_id: user.id,
      sender_role: profile.role || 'store',
      message_type: 'text',
      message: text,
    });
    if (error) { console.error('Message insert error:', error); return; }
    setText('');
    notifyOtherParty(orderId);
  };

  const handleImageAttach = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user || !profile || !orderId) return;
      setIsUploading(true);
      try {
        const path = `${orderId}/images/${Date.now()}.jpg`;
        const { data } = await supabase.storage.from('chat-media').upload(path, file);
        if (data) {
          const { error: msgError } = await supabase.from('messages').insert({
            order_id: orderId,
            sender_id: user.id,
            sender_role: profile.role || 'store',
            message_type: 'image',
            media_url: data.path,
          });
          if (msgError) console.error('Image message insert error:', msgError);
          else notifyOtherParty(orderId);
        }
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (!user || !profile || !orderId) return;
        setIsUploading(true);
        try {
          const path = `${orderId}/voice/${Date.now()}.webm`;
          const { data } = await supabase.storage.from('chat-media').upload(path, blob);
          if (data) {
            const { error: msgError } = await supabase.from('messages').insert({
              order_id: orderId,
              sender_id: user.id,
              sender_role: profile.role || 'store',
              message_type: 'voice',
              media_url: data.path,
              duration_seconds: recordingDuration,
            });
            if (msgError) console.error('Voice message insert error:', msgError);
            else notifyOtherParty(orderId);
          }
          setRecordingDuration(0);
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      let dur = 0;
      recordingTimerRef.current = setInterval(() => {
        dur++;
        setRecordingDuration(dur);
      }, 1000);
    } catch (e) {
      console.warn('Microphone not available');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const playVoice = (url: string, id: string) => {
    const audio = new Audio(url);
    setPlayingId(id);
    audio.play();
    audio.onended = () => setPlayingId(null);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const roleLabels: Record<string, string> = {
    store: t('chat.roleStore'),
    driver: t('chat.roleDriver'),
    admin: t('chat.roleAdmin'),
  };

  return (
    <div className="app-container flex flex-col h-screen">
      <div className="top-bar">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold">{t('chat.orderChat')} #{orderNumber}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(msg => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {!isMine && (
                <span className="text-[10px] text-muted-foreground mb-1">{roleLabels[msg.sender_role] || msg.sender_role}</span>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMine ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                {msg.message_type === 'text' && <p className="text-sm">{msg.message}</p>}
                {msg.message_type === 'image' && msg.media_url && signedUrls[msg.id] && (
                  <div className="space-y-1">
                    {msg.message && (
                      <p className="text-xs font-semibold opacity-80">{msg.message}</p>
                    )}
                    <img src={signedUrls[msg.id]} alt="" className="rounded-xl max-w-full cursor-pointer" onClick={() => window.open(signedUrls[msg.id], '_blank')} />
                  </div>
                )}
                {msg.message_type === 'voice' && msg.media_url && signedUrls[msg.id] && (
                  <button onClick={() => playVoice(signedUrls[msg.id], msg.id)} className="flex items-center gap-2 text-sm">
                    {playingId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <div className="w-24 h-1 bg-muted rounded-full" />
                    <span className="text-xs">{formatDuration(msg.duration_seconds || 0)}</span>
                  </button>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">
                {new Date(msg.created_at).toLocaleTimeString('ar-BH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border bg-card px-3 py-2 flex items-center gap-2">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-2.5 rounded-full ${isRecording ? 'bg-destructive animate-pulse' : 'bg-muted'}`}
          disabled={isUploading}
        >
          <Mic className="w-5 h-5" />
        </button>

        {isUploading ? (
          <div className="flex-1 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">{t('common.uploading')}</span>
          </div>
        ) : isRecording ? (
          <div className="flex-1 flex items-center justify-center gap-2">
            <span className="text-destructive text-sm font-medium">{t('common.recording')}</span>
            <span className="text-sm">{formatDuration(recordingDuration)}</span>
          </div>
        ) : (
          <>
            <button onClick={handleImageAttach} className="p-2.5 rounded-full bg-muted">
              <Camera className="w-5 h-5" />
            </button>
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendTextMessage()}
              placeholder={t('chat.typeMessage')}
              className="flex-1 h-10 bg-background border-border"
            />
            <button onClick={sendTextMessage} className="p-2.5 rounded-full bg-primary text-primary-foreground">
              <Send className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatScreen;
