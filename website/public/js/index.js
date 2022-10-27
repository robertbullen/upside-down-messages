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

	/** @type {HTMLFieldSetElement} */
	messageFormFieldset: querySelectorOrThrow('section#message-form fieldset'),

	/** @type {HTMLInputElement} */
	messageFormInput: querySelectorOrThrow('section#message-form input#message'),

	/** @type {HTMLDivElement} */
	messageFormSendDiv: querySelectorOrThrow('section#message-form div#send'),

	/** @type {HTMLDivElement} */
	messageFormSendingDiv: querySelectorOrThrow('section#message-form div#sending'),

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
 * @typedef {'show-message-form' | 'show-sending' | 'show-error' | 'show-sent' | 'show-profanity-detected' } State
 */

/**
 * @param {State} state
 */
function updateDomState(state) {
	/** @type {Map<HTMLElement, 'show' | 'hide' | 'enable' | 'disable'>} */
	const elementActionsMap = new Map([
		[elements.main, 'hide'],
		[elements.introductionSection, 'hide'],
		[elements.messageFormSection, 'hide'],
		[elements.messageFormFieldset, 'enable'],
		[elements.messageFormSendDiv, 'show'],
		[elements.messageFormSendingDiv, 'hide'],
		[elements.errorSection, 'hide'],
		[elements.sentAlertSection, 'hide'],
		[elements.profanityAlertSection, 'hide'],
	]);

	let scrollToElement;
	let focusElement;

	switch (state) {
		case 'show-message-form':
			elementActionsMap.set(elements.main, 'show');
			elementActionsMap.set(elements.introductionSection, 'show');
			elementActionsMap.set(elements.messageFormSection, 'show');
			elementActionsMap.set(elements.messageFormFieldset, 'enable');
			elementActionsMap.set(elements.messageFormSendDiv, 'show');
			elementActionsMap.set(elements.messageFormSendingDiv, 'hide');
			scrollToElement = elements.introductionSection;
			focusElement = elements.messageFormInput;
			break;

		case 'show-sending':
			elementActionsMap.set(elements.main, 'show');
			elementActionsMap.set(elements.introductionSection, 'show');
			elementActionsMap.set(elements.messageFormSection, 'show');
			elementActionsMap.set(elements.messageFormFieldset, 'disable');
			elementActionsMap.set(elements.messageFormSendDiv, 'hide');
			elementActionsMap.set(elements.messageFormSendingDiv, 'show');
			scrollToElement = elements.introductionSection;
			focusElement = elements.messageFormInput;
			break;

		case 'show-error':
			elementActionsMap.set(elements.main, 'show');
			elementActionsMap.set(elements.errorSection, 'show');
			scrollToElement = elements.errorSection;
			break;

		case 'show-sent':
			elementActionsMap.set(elements.main, 'show');
			elementActionsMap.set(elements.sentAlertSection, 'show');
			scrollToElement = elements.sentAlertSection;
			focusElement = elements.sentAlertButton;
			break;

		case 'show-profanity-detected':
			elementActionsMap.set(elements.main, 'show');
			elementActionsMap.set(elements.profanityAlertSection, 'show');
			scrollToElement = elements.profanityAlertSection;
			focusElement = elements.profanityAlertButton;
			break;

		default:
			break;
	}

	for (const [element, action] of elementActionsMap) {
		switch (action) {
			case 'show':
			case 'hide':
				showElement(element, action === 'show');
				break;

			case 'enable':
			case 'disable':
				// @ts-ignore
				element.disabled = action === 'disable';
				break;
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

				updateDomState('show-sending');

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
