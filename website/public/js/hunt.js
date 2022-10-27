/**
 * @typedef {object} Clue
 * @property {string} title
 * @property {string} subtitle
 * @property {string} question
 * @property {string[]} answers
 * @property {string[]} riddleLines
 * @property {string} upsideDownMessage
 */

/**
 * @template {Element} T
 * @param {string} selectors
 * @returns {T}
 */
function querySelectorOrThrow(selectors) {
	const element = /** @type {T | null} */ (document.querySelector(selectors));
	if (!element) {
		throw new Error(`Selectors '${selectors}' not found in document`);
	}
	return element;
}

const elements = {
	/** @type {HTMLDivElement} */
	spinnerDiv: querySelectorOrThrow('div#spinner'),

	/** @type {HTMLElement} */
	main: querySelectorOrThrow('main'),

	/** @type {HTMLElement} */
	titleSection: querySelectorOrThrow('section#title'),

	/** @type {HTMLHeadingElement} */
	titleTitleH1: querySelectorOrThrow('section#title h1'),

	/** @type {HTMLHeadingElement} */
	titleSubtitleH2: querySelectorOrThrow('section#title h2'),

	/** @type {HTMLElement} */
	questionSection: querySelectorOrThrow('section#question'),

	/** @type {HTMLParagraphElement} */
	questionQuestionP: querySelectorOrThrow('section#question p'),

	/** @type {HTMLFormElement} */
	questionForm: querySelectorOrThrow('section#question form'),

	/** @type {HTMLInputElement} */
	questionAnswerInput: querySelectorOrThrow('section#question input#answer'),

	/** @type {HTMLElement} */
	correctAlertSection: querySelectorOrThrow('section#correct-alert'),

	/** @type {HTMLButtonElement} */
	correctAlertButton: querySelectorOrThrow('section#correct-alert button'),

	/** @type {HTMLElement} */
	incorrectAlertSection: querySelectorOrThrow('section#incorrect-alert'),

	/** @type {HTMLButtonElement} */
	incorrectAlertButton: querySelectorOrThrow('section#incorrect-alert button'),

	/** @type {HTMLElement} */
	riddleSection: querySelectorOrThrow('section#riddle'),

	/** @type {HTMLUListElement} */
	riddleUl: querySelectorOrThrow('section#riddle ul'),

	/** @type {HTMLElement} */
	firstUdmAlertSection: querySelectorOrThrow('section#first-udm-alert'),

	/** @type {HTMLButtonElement} */
	firstUdmAlertButton: querySelectorOrThrow('section#first-udm-alert button'),

	/** @type {HTMLElement} */
	secondUdmAlertSection: querySelectorOrThrow('section#second-udm-alert'),

	/** @type {HTMLButtonElement} */
	secondUdmAlertButton: querySelectorOrThrow('section#second-udm-alert button'),
};

/**
 * @param {string} text
 * @returns {Promise<import('../../../lib/messages').Message>}
 */
async function postUpsideDownMessage(text) {
	const response = await fetch('/api/messages', {
		// TODO: Use a type definition for `body`.
		body: JSON.stringify({
			text: text,
		}),
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText}`);
	}

	return response.json();
}

/**
 * @param {Clue} clue
 */
function checkAnswer(clue) {
	function sanitizeAnswer(answer) {
		return answer
			.replace(/\W/g, ' ')
			.replace(/\s{2,}/g, ' ')
			.trim()
			.toLowerCase();
	}

	const answer = sanitizeAnswer(elements.questionAnswerInput.value);

	return clue.answers.map(sanitizeAnswer).includes(answer);
}

/**
 * @param {string} state
 */
function updateDomState(state) {
	/** @type {Map<HTMLElement, boolean>} */
	const showElementsMap = new Map([
		[elements.spinnerDiv, false],
		[elements.main, false],
		[elements.errorSection, false],
		[elements.questionSection, false],
		[elements.correctAlertSection, false],
		[elements.incorrectAlertSection, false],
		[elements.riddleSection, false],
		[elements.firstUdmAlertSection, false],
		[elements.secondUdmAlertSection, false],
	]);

	let scrollToElement;
	let focusElement;

	switch (state) {
		case 'loading':
			showElementsMap.set(elements.spinnerDiv, true);
			break;

		case 'show-question':
			showElementsMap.set(elements.main, true);
			showElementsMap.set(elements.questionSection, true);
			scrollToElement = elements.titleSection;
			focusElement = elements.questionAnswerInput;
			break;

		case 'show-correct-alert':
			showElementsMap.set(elements.main, true);
			showElementsMap.set(elements.questionSection, true);
			showElementsMap.set(elements.correctAlertSection, true);
			scrollToElement = elements.correctAlertSection;
			focusElement = elements.correctAlertButton;
			break;

		case 'show-incorrect-alert':
			showElementsMap.set(elements.main, true);
			showElementsMap.set(elements.questionSection, true);
			showElementsMap.set(elements.incorrectAlertSection, true);
			scrollToElement = elements.incorrectAlertSection;
			focusElement = elements.incorrectAlertButton;
			break;

		case 'show-riddle-1':
			showElementsMap.set(elements.main, true);
			showElementsMap.set(elements.riddleSection, true);
			showElementsMap.set(elements.firstUdmAlertSection, true);
			scrollToElement = elements.riddleSection;
			focusElement = elements.firstUdmAlertButton;
			break;

		case 'show-riddle-2':
			showElementsMap.set(elements.main, true);
			showElementsMap.set(elements.riddleSection, true);
			showElementsMap.set(elements.secondUdmAlertSection, true);
			scrollToElement = elements.secondUdmAlertSection;
			focusElement = elements.secondUdmAlertButton;
			break;

		case 'show-error':
			showElementsMap.set(elements.main, true);
			showElementsMap.set(elements.errorSection, true);
			scrollToElement = elements.errorSection;
			break;

		default:
			break;
	}

	for (const [element, show] of showElementsMap) {
		if (show) {
			element.classList.remove('hidden');
		} else {
			element.classList.add('hidden');
		}
	}

	// if (scrollToElement) {
	// 	setTimeout(() => {
	// 		if (focusElement) {
	// 			focusElement.focus({ preventScroll: true });
	// 		}
	// 		if (scrollToElement) {
	// 			scrollToElement.scrollIntoView();
	// 		}
	// 	}, 0);
	// }
}

async function main() {
	try {
		updateDomState('loading');

		const clue = await getClue();
		populateClue(clue);

		updateDomState('show-question');

		// Attach event handlers.
		elements.questionForm.addEventListener('submit', async (event) => {
			try {
				event.preventDefault();
				if (checkAnswer(clue)) {
					updateDomState('show-correct-alert');
				} else {
					updateDomState('show-incorrect-alert');
				}
			} catch (error) {
				populateError(error);
				updateDomState('show-error');
				throw error;
			}
		});

		elements.correctAlertButton.addEventListener('click', () => {
			try {
				updateDomState('show-riddle-1');
			} catch (error) {
				populateError(error);
				updateDomState('show-error');
			}
		});

		elements.incorrectAlertButton.addEventListener('click', () => {
			try {
				updateDomState('show-question');
			} catch (error) {
				populateError(error);
				updateDomState('show-error');
			}
		});

		elements.firstUdmAlertButton.addEventListener('click', async () => {
			try {
				await postUpsideDownMessage(clue);
				updateDomState('show-riddle-2');
			} catch (error) {
				populateError(error);
				updateDomState('show-error');
			}
		});

		elements.secondUdmAlertButton.addEventListener('click', async () => {
			try {
				await postUpsideDownMessage(clue);
				updateDomState('show-riddle-2');
			} catch (error) {
				populateError(error);
				updateDomState('show-error');
			}
		});
	} catch (error) {
		populateError(error);
		updateDomState('show-error');
		throw error;
	}
}

main();
