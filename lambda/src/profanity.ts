/// <reference path="./swearjar.d.ts" />

import BadWordsFilter from 'bad-words';
import leoProfanity from 'leo-profanity';
import swearjar from 'swearjar';

let badWordsFilter: BadWordsFilter;

/**
 * Inspects a string to see if it contains any profanity. This implementation currently relies on
 * three different profanity-checking libraries to ensure the broadest coverage of profanity.
 *
 * @param text The string to scan for profanity.
 * @returns `true` if profanity is found anywhere in `text`; `false` otherwise.
 */
export function isProfane(text: string): boolean {
	const prefix: string = isProfane.name;
	console.info(prefix, { text });

	badWordsFilter ??= new BadWordsFilter();

	const detections = {
		badWords: badWordsFilter.isProfane(text),
		leoProfanity: leoProfanity.check(text),
		swearjar: swearjar.profane(text),
	};
	console.info(prefix, { detections });

	const result: boolean = detections.badWords || detections.leoProfanity || detections.swearjar;
	console.info(prefix, { result });

	return result;
}
