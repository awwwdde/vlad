import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** clsx + tailwind-merge: последняя утилита из конфликтующей пары побеждает,
 *  поэтому className в пропсах может переопределять базовые классы. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
