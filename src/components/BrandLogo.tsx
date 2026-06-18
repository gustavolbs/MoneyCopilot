import Image from 'next/image';

export function BrandLogo({
  size = 40,
  tagline,
  showName = true,
  className = '',
}: {
  size?: number;
  tagline?: string;
  showName?: boolean;
  className?: string;
}) {
  return (
    <div className={`brand-logo${className ? ` ${className}` : ''}`} aria-label="MoneyCopilot">
      <Image
        className="brand-logo-image"
        src="/icons/icon-192.png"
        width={size}
        height={size}
        alt={showName ? '' : 'MoneyCopilot'}
      />
      {showName ? (
        <div className="brand-logo-copy">
          <strong>MoneyCopilot</strong>
          {tagline ? <span>{tagline}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
