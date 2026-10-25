import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { copyText } from '../../lib/validation';
import { useToast } from './Toast';

export function CodeBlock({
  code,
  label,
  language = 'bash',
}: {
  code: string;
  label?: string;
  language?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const ok = await copyText(code);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast.push('Komut kopyalandı.', 'success');
    } else {
      toast.push('Kopyalanamadı; metni elle seçebilirsin.', 'error');
    }
  };

  return (
    <div className="code-block">
      <div className="code-block__header">
        <span>{label ?? language}</span>
        <button
          type="button"
          className="code-block__copy"
          onClick={() => void copy()}
          aria-label="Kodu kopyala"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <pre className="code-block__body">
        <code>{code}</code>
      </pre>
    </div>
  );
}
