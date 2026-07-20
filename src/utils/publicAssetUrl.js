const publicAssetUrl = (path = '') => (
  `${import.meta.env.BASE_URL}${String(path).replace(/^\/+/, '')}`
);

export default publicAssetUrl;