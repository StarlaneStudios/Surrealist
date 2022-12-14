import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs';

const { version, author } = JSON.parse(readFileSync('./package.json', 'utf8'));

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'~': fileURLToPath(new URL('src', import.meta.url)),
			'$': fileURLToPath(new URL('wailsjs', import.meta.url))
		}
	},
	css: {
		modules: {
			localsConvention: 'dashesOnly'
		}
	},
	define: {
		'import.meta.env.VERSION': `"${version}"`,
		'import.meta.env.AUTHOR': `"${author}"`,
	}
});