/**
 * Redux Store — Khởi tạo store toàn cục
 */

import { createStore } from 'redux';
import appReducer from './reducers';

const store = createStore(appReducer);

export default store;
