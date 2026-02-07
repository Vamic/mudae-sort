import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		router: {
			type: 'hash'
		},
		paths: {
			base: process.argv.includes('dev') ? '' : process.env.BASE_PATH
		},
		output: {
			bundleStrategy: 'inline'
		}
	}
};

export default config;