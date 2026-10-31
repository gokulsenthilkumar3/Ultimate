import { createContext, useContext, type ReactNode } from 'react';

export const PageArtworkContext = createContext<ReactNode>(null);
/** Domain presentation supplies the artwork; headers never import product modules. */
export default function PageArtwork() { return useContext(PageArtworkContext); }
