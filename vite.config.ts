import react from '@vitejs/plugin-react';
import { ViteImageOptimizer as images } from 'vite-plugin-image-optimizer';
import { Mode, plugin as markdown } from 'vite-plugin-markdown';
import { UserConfig, defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { version, surreal } from './package.json';

const isPreview = process.env.VITE_SURREALIST_PREVIEW === "true";

export const getDefaultConfig = ({ mode }): UserConfig => ({
	plugins: [
		images(),
		react(),
		markdown({
			mode: [Mode.HTML]
		}),
	],
	clearScreen: false,
	envPrefix: ['VITE_', 'TAURI_'],
	server: {
		port: 1420,
		strictPort: true
	},
	build: {
		target: "esnext",
		minify: process.env.TAURI_DEBUG ? false : 'esbuild',
		sourcemap: !!process.env.TAURI_DEBUG,
		rollupOptions: {
			input: {
				'surrealist': '/index.html',
				'mini-run': '/mini/run.html',
				'mini-new': '/mini/new.html'
			},
			output: {
				experimentalMinChunkSize: 5000,
				manualChunks: {
					react: ["react", "react-dom"],
					codemirror: ["codemirror", "codemirror-surrealql", "@replit/codemirror-indentation-markers"],
					posthog: ["posthog-js"],
					mantime: ["@mantine/core", "@mantine/hooks", "@mantine/notifications"],
					surreal: ["surrealdb.js", "surrealdb.wasm"] // TODO : surrealql.wasm
				}
			}
		},
	},
	esbuild: {
		supported: {
			'top-level-await': true //browsers can handle top-level-await features
		},
	},
	resolve: {
		alias: {
			'~': fileURLToPath(new URL('src', import.meta.url))
		}
	},
	css: {
		modules: {
			localsConvention: 'dashesOnly'
		},
		preprocessorOptions: {
			scss: {
				additionalData: '@import "~/assets/styles/mixins.scss";',
			},
		},
	},
	define: {
		'import.meta.env.VERSION': JSON.stringify(version),
		'import.meta.env.SDB_VERSION': JSON.stringify(surreal),
		'import.meta.env.POSTHOG_KEY': JSON.stringify("phc_BWVuHaJuhnFi3HthLhb9l8opktRrNeFHVnisZdQ5404"),
		'import.meta.env.POSTHOG_URL': JSON.stringify("https://eu.i.posthog.com"),
		'import.meta.env.MODE': JSON.stringify(isPreview ? "preview" : mode),
	},
	optimizeDeps: {
		exclude: ['surrealdb.wasm', 'surrealql.wasm'],
		esbuildOptions: {
			target: 'esnext',
		},
	},
	assetsInclude: ['**/surrealdb.wasm/dist/*.wasm', '**/surrealql.wasm/dist/*.wasm']
});

// https://vitejs.dev/config/
export default defineConfig(getDefaultConfig);
