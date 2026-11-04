import '@testing-library/jest-dom';
import { configure } from '@testing-library/dom';

// The first lazy domain import includes cold Vite transformation. That work
// can exceed Testing Library's one-second default on a busy worker. Browser
// and build performance budgets are checked separately.
configure({ asyncUtilTimeout: 5000 });
