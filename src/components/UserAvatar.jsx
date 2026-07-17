import React, { useEffect, useState } from 'react';
import { DEFAULT_AVATAR_URL, resolveAvatarUrl } from '../utils/avatarUrl';

const UserAvatar = ({ avatarUrl, alt = 'avatar', ...props }) => {
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  const [src, setSrc] = useState(resolvedUrl);

  useEffect(() => {
    setSrc(resolvedUrl);
  }, [resolvedUrl]);

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      onError={() => {
        if (src !== DEFAULT_AVATAR_URL) setSrc(DEFAULT_AVATAR_URL);
      }}
    />
  );
};

export default UserAvatar;