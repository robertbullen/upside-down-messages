/**
 * @typedef {object} Clue
 * @property {string} title
 * @property {string} subtitle
 * @property {string} question
 * @property {string[]} answers
 * @property {string[]} riddleLines
 * @property {string} upsideDownMessage
 */

const elements = {
	/** @type {HTMLDivElement} */
	spinnerDiv: document.querySelector('div#spinner'),

	/** @type {HTMLElement} */
	main: document.querySelector('main'),

	/** @type {HTMLElement} */
	titleSection: document.querySelector('section#title'),

	/** @type {HTMLHeadingElement} */
	titleTitleH1: document.querySelector('section#title h1'),

	/** @type {HTMLHeadingElement} */
	titleSubtitleH2: document.querySelector('section#title h2'),

	/** @type {HTMLElement} */
	errorSection: document.querySelector('section#error'),

	/** @type {HTMLSpanElement} */
	errorMessageSpan: document.querySelector('section#error span#error-message'),

	/** @type {HTMLElement} */
	questionSection: document.querySelector('section#question'),

	/** @type {HTMLParagraphElement} */
	questionQuestionP: document.querySelector('section#question p'),

	/** @type {HTMLFormElement} */
	questionForm: document.querySelector('section#question form'),

	/** @type {HTMLInputElement} */
	questionAnswerInput: document.querySelector('section#question input#answer'),

	/** @type {HTMLElement} */
	correctAlertSection: document.querySelector('section#correct-alert'),

	/** @type {HTMLButtonElement} */
	correctAlertButton: document.querySelector('section#correct-alert button'),

	/** @type {HTMLElement} */
	incorrectAlertSection: document.querySelector('section#incorrect-alert'),

	/** @type {HTMLButtonElement} */
	incorrectAlertButton: document.querySelector('section#incorrect-alert button'),

	/** @type {HTMLElement} */
	riddleSection: document.querySelector('section#riddle'),

	/** @type {HTMLUListElement} */
	riddleUl: document.querySelector('section#riddle ul'),

	/** @type {HTMLElement} */
	firstUdmAlertSection: document.querySelector('section#first-udm-alert'),

	/** @type {HTMLButtonElement} */
	firstUdmAlertButton: document.querySelector('section#first-udm-alert button'),

	/** @type {HTMLElement} */
	secondUdmAlertSection: document.querySelector('section#second-udm-alert'),

	/** @type {HTMLButtonElement} */
	secondUdmAlertButton: document.querySelector('section#second-udm-alert button'),
};

/**
 * @returns {Clue}
 */
async function getClue() {
	const queryParams = new URLSearchParams(window.location.search);
	const clueName = queryParams.get('clueName') ?? 'chapter0';

	// Fetch the clue and add it to the DOM.
	const clueFilePath = `clues/${clueName}.json`;
	const response = await fetch(clueFilePath);
	if (!response.ok) {
		throw new Error(
			`Error fetching \`clueFilePath\`='${clueFilePath}': ${response.status} ${response.statusText}`,
		);
	}

	return await response.json();
}

/**
 * @param {Clue} clue
 */
function populateClue(clue) {
	elements.titleTitleH1.innerText = clue.title;
	elements.titleSubtitleH2.innerText = clue.subtitle;

	elements.questionQuestionP.innerText = clue.question;

	while (elements.riddleUl.lastElementChild) {
		elements.riddleUl.lastElementChild.remove();
	}

	elements.riddleUl.append(
		...clue.riddleLines.map((riddleLine) => {
			const li = document.createElement('li');
			li.innerText = riddleLine;
			return li;
		}),
	);
}

/**
 * @param {Error} error
 */
function populateError(error) {
	elements.errorMessageSpan.innerText = error.message;
}

/**
 * @param {Clue} clue
 */
async function postUpsideDownMessage(clue) {
	const response = await fetch('/api/messages', {
		// TODO: Use a type definition for `body`.
		body: JSON.stringify({
			text: clue.upsideDownMessage,
		}),
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText}`);
	}
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
