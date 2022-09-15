import BadWordsFilter from 'bad-words';
import leoProfanity from 'leo-profanity';
import swearjar from 'swearjar';

const badWordsFilter = new BadWordsFilter();

/**
 * Inspects a string to see if it contains any profanity. This implementation currently relies on
 * three different profanity-checking libraries to ensure the broadest coverage of profanity.
 *
 * @param text The string to inspect for profanity.
 * @returns `true` if profanity is found; `false` otherwise.
 */
export function isProfane(text: string): boolean {
	return badWordsFilter.isProfane(text) || leoProfanity.check(text) || swearjar.profane(text);
}
