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
	badWordsFilter ??= new BadWordsFilter();
	return (
		badWordsFilter.isProfane(text) ||
		leoProfanity.check(text) ||
		swearjar.profane(text)
	);
}
