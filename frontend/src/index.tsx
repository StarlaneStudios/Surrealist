import { createRoot } from 'react-dom/client';
import { Provider } from "react-redux";
import { actions, store } from './store';
import { App } from './components/App';
import { loader } from '@monaco-editor/react';
import { initializeEditor } from './util/editor';
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from 'dayjs';
import { LoadConfig } from '$/go/backend/Surrealist';
import { initializeListeners } from './util/database';

dayjs.extend(relativeTime);

// Load existing config
LoadConfig().then(config => {
	store.dispatch(actions.initialize(config));
});

// Render the app component
const root = document.querySelector('#root')!;

createRoot(root).render(
	<Provider store={store}>
		<App />
	</Provider>
);

// Init monaco
loader.init().then(monaco => {
	initializeEditor(monaco);
});

// Listen to database events
initializeListeners();