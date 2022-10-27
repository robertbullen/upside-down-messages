/**
 * @template {Element} T
 * @param {string} selectors
 * @returns {T}
 */
export function querySelectorOrThrow(selectors) {
	const element = /** @type {T | null} */ (document.querySelector(selectors));
	if (!element) {
		throw new Error(`Selectors '${selectors}' not found in document`);
	}
	return element;
}

export const errorElements = {
	/** @type {HTMLElement} */
	errorSection: querySelectorOrThrow('section#error'),

	/** @type {HTMLSpanElement} */
	errorMessageSpan: querySelectorOrThrow('section#error span#error-message'),
};

/**
 * @param {HTMLElement} element
 * @param {boolean} show
 * @returns {void}
 */
export function showElement(element, show) {
	if (show) {
		element.classList.remove('hidden');
	} else {
		element.classList.add('hidden');
	}
}

/**
 * @template T
 * @param {(state: 'show-error') => void} updateDomState
 * @param {() => T} runTryClause
 * @returns {Promise<T>}
 */
export async function tryCatch(updateDomState, runTryClause) {
	try {
		return await runTryClause();
	} catch (error) {
		if (error instanceof Error) {
			errorElements.errorMessageSpan.textContent = error.message;
			updateDomState('show-error');
		}
		throw error;
	}
}

/**
 * @param {import('../../../lib/messages.js').MessageRequest} messageRequest
 * @returns {Promise<import('../../../lib/messages.js').MessageResponse>}
 */
export async function postUpsideDownMessage(messageRequest) {
	const prefix = postUpsideDownMessage.name;
	console.info(prefix, { messageRequest });

	try {
		const response = await fetch('/api/messages', {
			body: JSON.stringify(messageRequest),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST',
		});

		if (response.status >= 500) {
			throw new Error(`${response.status} ${response.statusText}`);
		}

		/** @type {import('../../../lib/messages.js').MessageResponse} */
		const messageResponse = await response.json();
		console.info(prefix, { messageResponse });

		return messageResponse;
	} catch (error) {
		console.error(prefix, { error });
		throw error;
	}
}
