/**
 * withRouter HOC — Truyền navigate vào Class Components
 * Vì useNavigate() hook không dùng được trong Class Component
 */

import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

export function withRouter(WrappedComponent) {
  function ComponentWithRouterProp(props) {
    const navigate = useNavigate();
    const params = useParams();
    const location = useLocation();
    return <WrappedComponent {...props} navigate={navigate} params={params} location={location} />;
  }
  return ComponentWithRouterProp;
}
