import publicAssetUrl from '../utils/publicAssetUrl';

const eCoin = publicAssetUrl('assets/ECoint.png');
const knowledgeCore = publicAssetUrl('assets/Knowledge_Core.png');
const knowledgePoint = publicAssetUrl('assets/Knowledge_Point.png');
const sanity = publicAssetUrl('assets/Sanity.png');

const currencyAssets = {
  eCoin,
  ecoin: eCoin,
  knowledgeCore,
  knowledgePoint,
  sanity,
};

export default currencyAssets;