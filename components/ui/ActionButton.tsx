'use client';

import Spinner from "./Spinner";

type Props = {
  label: string;
  onClick?: (...args: any[]) => any | Promise<any>;
  isBusy?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "success" | "danger";
  title?: string;
  fullWidth?: boolean;
};

export default function ActionButton({
  label,
  onClick,
  isBusy = false,
  disabled = false,
  variant = "primary",
  title,
  fullWidth = false,
}: Props) {
  const variants = {
    primary:
      "border-[#14F195]/50 text-[#14F195] hover:bg-[#14F195]/10 hover:shadow-[0_0_15px_#14F19560] active:scale-[0.98]",
    secondary:
      "border-white/20 text-white/80 hover:bg-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] active:scale-[0.98]",
    success:
      "border-[#00FFA3]/40 text-[#00FFA3] bg-[#001F12]/60 hover:bg-[#00FFA3]/10 hover:shadow-[0_0_12px_#00FFA360] active:scale-[0.98]",
    danger:
      "border-[#FF4B4B]/40 text-[#FF4B4B] hover:bg-[#FF4B4B]/10 hover:shadow-[0_0_12px_#FF4B4B60] active:scale-[0.98]",
  };

  return (
    <button
      onClick={onClick as any}
      disabled={disabled || isBusy}
      title={title}
      className={`relative rounded-xl border text-sm font-semibold px-5 py-2.5 sm:py-3 sm:text-base 
        transition-all duration-300 flex items-center justify-center gap-2 
        ${variants[variant]} 
        ${fullWidth ? "w-full" : "sm:w-auto"} 
        disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {isBusy ? (
        <>
          <Spinner size={18} />
          <span className="text-white/70 animate-pulse">Please wait…</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
