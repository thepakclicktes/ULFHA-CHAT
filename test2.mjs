import React, { useContext, createContext } from 'react';
const ctx = createContext();
try {
  useContext(ctx);
} catch (e) {
  console.log(e.message);
}
