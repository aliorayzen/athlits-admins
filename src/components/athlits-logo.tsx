import Image from "next/image";

const LOGO_SRC = {
  colored: "/brand/athlits-colored-logo.png",
  white: "/brand/athlits-white-logo.png",
  black: "/brand/athlits-black-logo.png",
} as const;

type AthlitsLogoVariant = keyof typeof LOGO_SRC;

interface AthlitsLogoProps {
  /** Colorway of the mark — colored (teal) is the default brand treatment. */
  variant?: AthlitsLogoVariant;
  /** Rendered square size in px (source asset is 1024×1024 with alpha). */
  size?: number;
  className?: string;
}

/**
 * Athlits brand mark. Decorative by default (empty alt) because every
 * placement pairs it with a visible or aria-label'd wordmark.
 */
export function AthlitsLogo({
  variant = "colored",
  size = 24,
  className,
}: AthlitsLogoProps) {
  return (
    <Image
      src={LOGO_SRC[variant]}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
