/**
 * Cosmetic Database (Local Fallback + Cloud SK registry)
 */

export const S3_ASSETS_BASE = import.meta.env.VITE_S3_ASSETS_URL;



export const COSMETICS = {
  backgrounds: [
    {
      id: 'studyplant',
      name: 'Study Plant',
      assets: {},
      preview: 'radial-gradient(circle at 18% 16%, rgba(34, 211, 238, 0.38) 0%, transparent 28%), radial-gradient(circle at 82% 20%, rgba(217, 70, 239, 0.34) 0%, transparent 30%), radial-gradient(circle at 68% 78%, rgba(251, 191, 36, 0.24) 0%, transparent 30%), linear-gradient(135deg, rgba(9, 16, 43, 0.98) 0%, rgba(13, 37, 67, 0.96) 42%, rgba(26, 12, 53, 0.96) 100%)',
      profileBackground: 'linear-gradient(180deg, rgba(2, 6, 23, 0.32) 0%, rgba(2, 6, 23, 0.76) 100%), radial-gradient(circle at 18% 16%, rgba(34, 211, 238, 0.38) 0%, transparent 28%), radial-gradient(circle at 82% 20%, rgba(217, 70, 239, 0.34) 0%, transparent 30%), radial-gradient(circle at 68% 78%, rgba(251, 191, 36, 0.24) 0%, transparent 30%), linear-gradient(135deg, rgba(9, 16, 43, 0.98) 0%, rgba(13, 37, 67, 0.96) 42%, rgba(26, 12, 53, 0.96) 100%)',
      desktopBackground: 'radial-gradient(circle at 18% 16%, rgba(34, 211, 238, 0.38) 0%, transparent 28%), radial-gradient(circle at 82% 20%, rgba(217, 70, 239, 0.34) 0%, transparent 30%), radial-gradient(circle at 68% 78%, rgba(251, 191, 36, 0.24) 0%, transparent 30%), linear-gradient(135deg, rgba(9, 16, 43, 0.98) 0%, rgba(13, 37, 67, 0.96) 42%, rgba(26, 12, 53, 0.96) 100%)',
    },
  ],
  frames: [],
  titles: [],
  themes: [],
  systemIcons: [
    { id: 'icon_default', name: 'Linear Neon', type: 'outline' },
    { id: 'icon_solid', name: 'Neural Solid', type: 'filled' },
    { id: 'icon_glass', name: 'Frosted Glass', type: 'glass' },
  ],
};
