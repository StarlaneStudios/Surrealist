import { mapValues } from "radash";
import "../assets/styles/embed-new.scss";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { createRoot } from "react-dom/client";
import { DATASETS, ORIENTATIONS } from "~/constants";
import { Orientation } from "~/types";

// type Theme = keyof typeof themes;
// const themes = {
// 	auto: "Automatic",
// 	light: "Light",
// 	dark: "Dark"
// };

const datasets = {
	"none": "None",
	...mapValues(DATASETS, (value) => value.name)
};

function App() {
	const defaults = useMemo(() => processUrl(location.toString()), []);
	const [dataset, setDataset] = useState<string>(defaults.dataset);
	const [setup, setSetup] = useState<string>(defaults.setup);
	const [query, setQuery] = useState<string>(defaults.query);
	const [variables, setVariables] = useState<string>(defaults.variables);
	// const [theme, setTheme] = useState<Theme>(defaults.theme);
	const [orientation, setOrientation] = useState<Orientation>("vertical");
	const [copied, onCopy] = useBoomerang(false);

	const url = useMemo(() => {
		const search = new URLSearchParams();

		if (dataset != 'none') search.append('dataset', dataset);
		if (setup && setup.length > 0) search.append('setup', setup);
		if (query && query.length > 0) search.append('query', query);
		if (Object.keys(variables).length > 0) search.append('variables', variables);
		if (orientation !== 'vertical') search.append('orientation', orientation);
		// if (theme !== 'auto') search.append('theme', theme);

		const url = new URL(location.toString());
		url.pathname = url.hostname == 'localhost' ? 'mini/run.html' : 'mini';
		url.search = search.toString();

		return url.toString();
	}, [dataset, setup, query, variables, orientation, /*theme*/]);

	const [delayedUrl, countdown, setDelayedUrl] = useDelayedValue(url);
	const reloadIframe = useCallback(() => {
		setDelayedUrl("");
		setTimeout(() => setDelayedUrl(url), 1);
	}, [setDelayedUrl, url]);

	const onUrlInput = useCallback((e: FormEvent<HTMLInputElement>) => {
		try {
			const params = processUrl(e.currentTarget.value);
			setDataset(params.dataset);
			setSetup(params.setup);
			setQuery(params.query);
			setVariables(params.variables);
			setOrientation(params.orientation);
			// setTheme(params.theme);
		} catch(_err) {
			(_err);
			alert("Invalid URL pasted");
		}
	}, []);

	const reset = useCallback(() => {
		setDataset("none");
		setSetup("");
		setQuery("");
		setVariables("");
		// setTheme("auto");
		reloadIframe();
	}, []);

	useEffect(() => {
		const { search } = new URL(url);
		history.replaceState({}, null as unknown as string, `${location.pathname}${search}`);
	}, [url]);

	return (
		<main>
			<div className="logo">
				<img src="/favicon.ico" alt="Surrealist logo" width="80" />
				<h1>Surrealist Mini Generator</h1>
			</div>
			<div className="columns">
				<form id="form">
					<div className="title-button">
						<h2>Configuration</h2>
						<button type="button" onClick={reset}>
							reset
						</button>
					</div>
					<div className="section">
						<label htmlFor="dataset">Dataset</label>
						<select
							name="dataset"
							id="dataset"
							value={dataset}
							onInput={(e) => setDataset(e.currentTarget.value)}
						>
							{Object.entries(datasets).map(([key, name]) => (
								<option key={key} value={key}>{name}</option>
							))}
						</select>
					</div>

					<div className="section">
						<label htmlFor="setup">Setup</label>
						<textarea
							name="setup"
							id="setup"
							placeholder="SELECT * FROM ..."
							rows={6}
							value={setup}
							onInput={(e) => setSetup(e.currentTarget.value)}
						/>
					</div>

					<div className="section">
						<label htmlFor="query">Query</label>
						<textarea
							name="query"
							id="query"
							placeholder="SELECT * FROM ..."
							rows={6}
							value={query}
							onInput={(e) => setQuery(e.currentTarget.value)}
						/>
					</div>

					<div className="section">
						<label htmlFor="variables">Variables</label>
						<textarea
							name="variables"
							id="variables"
							placeholder="{}"
							rows={6}
							value={variables}
							onInput={(e) => setVariables(e.currentTarget.value)}
						/>
					</div>

					<div className="section">
						<label htmlFor="theme">Orientation</label>
						<select
							name="theme"
							id="theme"
							value={orientation}
							onInput={(e) => setOrientation(e.currentTarget.value as Orientation)}
						>
							{ORIENTATIONS.map(({ label, value }) => (
								<option key={value} value={value}>{label}</option>
							))}
						</select>
					</div>

					{/* <div className="section">
						<label htmlFor="theme">Theme</label>
						<select
							name="theme"
							id="theme"
							value={theme}
							onInput={(e) => setTheme(e.currentTarget.value as Theme)}
						>
							{Object.entries(themes).map(([key, value]) => (
								<option key={key} value={key}>{value}</option>
							))}
						</select>
					</div> */}
				</form>
				<div className="preview">
					<div className="title-button">
						<h2>Preview</h2>
						<CopyToClipboard text={url} onCopy={onCopy}>
							<button type="button" className={copied ? "green" : ""}>
								Copy URL
							</button>
						</CopyToClipboard>
					</div>
					<div className="section">
						<label>URL</label>
						<input id="output" value={url} onInput={onUrlInput} onFocus={(e) => e.currentTarget.select()} />
					</div>
					<div className="section">
						<label>Preview</label>
						<iframe src={delayedUrl} width="100%" height="550" frameBorder={0} />
						<div>
							<button type="button" onClick={reloadIframe}>
								Reload Embed {countdown > 0 && `(${countdown})`}
							</button>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}

function parseJson(input: string) {
	try {
		return JSON.parse(input);
	} catch(_err) {
		(_err);
		return {};
	}
}

function processUrl(input: string) {
	const url = new URL(input);
	const search = new URLSearchParams(url.search);
	const { dataset, setup, query, variables, theme } = Object.fromEntries(search.entries());
	const parsedVariables = parseJson(variables);

	return {
		dataset: Object.keys(DATASETS).includes(dataset) ? dataset : 'none',
		setup: setup ? setup.toString() : '',
		query: query ? query.toString() : '',
		variables: Object.keys(parsedVariables).length > 0 ? JSON.stringify(parsedVariables, null, 4) : '',
		orientation: url.searchParams.get('orientation') as Orientation || 'vertical',
		// theme: Object.keys(themes).includes(theme) ? theme : 'auto'
	} as {
		dataset: string;
		setup: string;
		query: string;
		variables: string;
		orientation: Orientation;
		// theme: Theme;
	};
}

function useDelayedValue<T>(value: T, seconds = 3) {
	const ref = useRef<number>(0);
	const [current, setCurrent] = useState(value);
	const [countdown, setCountdown] = useState(0);

	useEffect(() => {
		ref.current++;
		if (value == current) {
			setCountdown(0);
			return;
		}

		const thisRef = ref.current;
		let count = seconds;
		setCountdown(count);

		const interval = setInterval(() => {
			if (thisRef != ref.current) {
				clearInterval(interval);
			} else if (value == current) {
				clearInterval(interval);
				setCountdown(0);
			} else if (count > 0) {
				count--;
				setCountdown(count);
			} else {
				setCurrent(value);
			}
		}, 1000);
	}, [ref, value, current, setCountdown]);

	return [current, countdown, setCurrent] as const;
}

function useBoomerang(initial: boolean, timeout = 1000) {
	const ref = useRef<number>(0);
	const [state, setState] = useState(initial);

	const trigger = useCallback(() => {
		ref.current++;
		const thisRef = ref.current;
		setState(!initial);

		setTimeout(() => {
			if (thisRef == ref.current) {
				setState(initial);
			}
		}, timeout);
	}, [ref, initial, setState]);

	return [state, trigger] as const;
}

(async () => {
	// Render the app component
	const root = document.querySelector("#root")!;

	createRoot(root).render(<App />);
})();