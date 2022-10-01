snowStorm.animationInterval = 20;
snowStorm.excludeMobile = false;
snowStorm.flakeHeight = 24;
snowStorm.flakeWidth = 24;
snowStorm.followMouse = false;
snowStorm.snowColor = 'rgba(255,255,228,0.25)';
snowStorm.snowStick = false;
snowStorm.useTwinkleEffect = false;
snowStorm.vMaxX = 0;
snowStorm.vMaxY = 0;

// Redefine `snowStorm.snowCharacter` to randomize the flakes between a few options.
Object.defineProperty(snowStorm, 'snowCharacter', {
	get() {
		const characters = '⬬⬬⬬●●⬮';
		return characters[Math.floor(Math.random() * characters.length)];
	},
});
