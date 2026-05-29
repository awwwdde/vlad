export const sectionVariants = {
  initial: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? 70 : -70,
  }),
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? -70 : 70,
    transition: { duration: 0.32, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  }),
}
