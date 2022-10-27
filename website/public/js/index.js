import {
	errorElements,
	postUpsideDownMessage,
	querySelectorOrThrow,
	showElement,
	tryCatch,
} from './common.js';

const elements = {
	...errorElements,

	/** @type {HTMLElement} */
	main: querySelectorOrThrow('main'),

	/** @type {HTMLElement} */
	introductionSection: querySelectorOrThrow('section#introduction'),

	/** @type {HTMLElement} */
	messageFormSection: querySelectorOrThrow('section#message-form'),

	/** @type {HTMLFormElement} */
	messageFormForm: querySelectorOrThrow('section#message-form form'),

	/** @type {HTMLInputElement} */
	messageFormInput: querySelectorOrThrow('section#message-form form input#message'),

	/** @type {HTMLParagraphElement} */
	messageFormCharsRemainingP: querySelectorOrThrow('section#message-form p#chars-remaining'),

	/** @type {HTMLElement} */
	sentAlertSection: querySelectorOrThrow('section#sent-alert'),

	/** @type {HTMLButtonElement} */
	sentAlertButton: querySelectorOrThrow('section#sent-alert button'),

	/** @type {HTMLParagraphElement} */
	sentAlertQueueWaitP: querySelectorOrThrow('section#sent-alert p#queue-wait'),

	/** @type {HTMLSpanElement} */
	sentAlertQueueLengthSpan: querySelectorOrThrow('section#sent-alert span#queue-length'),

	/** @type {HTMLElement} */
	profanityAlertSection: querySelectorOrThrow('section#profanity-alert'),

	/** @type {HTMLButtonElement} */
	profanityAlertButton: querySelectorOrThrow('section#profanity-alert button'),
};

/**
 * @typedef {'show-message-form' | 'show-error' | 'show-sent' | 'show-profanity-detected' } State
 */

/**
 * @param {State} state
 */
function updateDomState(state) {
	/** @type {Map<HTMLElement, boolean>} */
	const showElementsMap = new Map([
		[elements.main, false],
		[elements.introductionSection, false],
		[elements.messageFormSection, false],
		[elements.errorSection, false],
		[elements.sentAlertSection, false],
		[elements.profanityAlertSection, false],
	]);

	let scrollToElement;
	let focusElement;

	switch (state) {
		case 'show-message-form':
			showElementsMap.set(elements.main, true);
			showElementsMap.set(elements.introductionSection, true);
			showElementsMap.set(elements.messageFormSection, true);
			scrollToElement = elements.introductionSection;
			focusElement = elements.messageFormInput;
			break;

		case 'show-error':
			showElementsMap.set(elements.main, true);
			showElementsMap.set(elements.errorSection, true);
			scrollToElement = elements.errorSection;
			break;

		case 'show-sent':
			showElementsMap.set(elements.main, true);
			showElementsMap.set(elements.sentAlertSection, true);
			scrollToElement = elements.sentAlertSection;
			focusElement = elements.sentAlertButton;
			break;

		case 'show-profanity-detected':
			showElementsMap.set(elements.main, true);
			showElementsMap.set(elements.profanityAlertSection, true);
			scrollToElement = elements.profanityAlertSection;
			focusElement = elements.profanityAlertButton;
			break;

		default:
			break;
	}

	for (const [element, show] of showElementsMap) {
		showElement(element, show);
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

function main() {
	tryCatch(updateDomState, () => {
		// Update the characters remaining hint as the user types.
		{
			const charsRemainingFormat =
				elements.messageFormCharsRemainingP.textContent ?? '%u characters remaining';

			function updateCharsRemaining() {
				tryCatch(updateDomState, () => {
					const charsRemaining =
						elements.messageFormInput.maxLength -
						elements.messageFormInput.value.length;
					elements.messageFormCharsRemainingP.textContent = charsRemainingFormat.replace(
						'%u',
						charsRemaining.toString(),
					);
				});
			}

			elements.messageFormInput.addEventListener('input', updateCharsRemaining);
			updateCharsRemaining();
		}

		// Send the message when the user submits the form.
		elements.messageFormForm.addEventListener('submit', (event) => {
			tryCatch(updateDomState, async () => {
				event.preventDefault();

				/** @type {import('../../../lib/messages.js').MessageRequest} */
				const messageRequest = { text: elements.messageFormInput.value };
				const messageResponse = await postUpsideDownMessage(messageRequest);

				if ('errorCode' in messageResponse) {
					switch (messageResponse.errorCode) {
						case 'profanity-detected':
							updateDomState('show-profanity-detected');
							break;

						default:
							throw new Error(
								`Unhandled \`errorCode\`: '${messageResponse.errorCode}'`,
							);
					}
				} else if ('errorMessage' in messageResponse) {
					throw new Error(messageResponse.errorMessage);
				} else {
					elements.sentAlertQueueLengthSpan.textContent =
						messageResponse.approximateQueueIndex.toString();
					showElement(
						elements.sentAlertQueueWaitP,
						messageResponse.approximateQueueIndex >= 1,
					);
					updateDomState('show-sent');
				}
			});
		});

		// Handle alert button presses.
		function handleButtonPress() {
			tryCatch(updateDomState, () => updateDomState('show-message-form'));
		}

		elements.sentAlertButton.addEventListener('click', handleButtonPress);
		elements.profanityAlertButton.addEventListener('click', handleButtonPress);

		// Show the default DOM state.
		updateDomState('show-message-form');
	});
}

main();
