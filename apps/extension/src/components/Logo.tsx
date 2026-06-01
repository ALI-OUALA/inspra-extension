type LogoProps = {
  compact?: boolean;
  className?: string;
};

export function Logo({ compact = false, className = "" }: LogoProps) {
  if (compact) {
    return <img src="/icon/inspra-symbol.svg" alt="Inspra Extension" className={className} />;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} aria-label="Inspra Extension">
      <Logo compact className="h-7 w-7" />
      <span className="text-[22px] font-medium tracking-normal text-ink">inspra</span>
    </div>
  );
}
