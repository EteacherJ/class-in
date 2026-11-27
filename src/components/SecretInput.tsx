import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * 🔒 개인 주소(캘린더 비공개 주소 · Apps Script 웹 앱 주소 · 드라이브 폴더 주소 등) 가림 입력칸
 * - 평소에는 ●●● 로 가려 두고, 눈 아이콘을 눌렀을 때만 보여 줍니다 (화면 공유·수업 중 노출 방지).
 */
export const SecretInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { wrapperClassName?: string }> = ({
  className = '',
  wrapperClassName = '',
  type: _type,
  ...rest
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative flex-1 min-w-0 ${wrapperClassName}`}>
      <input
        {...rest}
        type={show ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        className={`${className} w-full pr-8`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
        title={show ? '가리기' : '주소 보기'}
        aria-label={show ? '주소 가리기' : '주소 보기'}
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

export default SecretInput;
