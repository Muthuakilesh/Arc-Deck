document.createElement("div");
export default function LauncherCard(app) {
	const card = document.createElement('div');
	card.className = 'glass card launcher launcher-card';

	const icon = document.createElement('div');
	icon.className = 'launcher-icon';
	icon.textContent = app.icon || '◈';
	icon.setAttribute('aria-hidden', 'true');

	const title = document.createElement('h3');
	title.textContent = app.name || '';

	const status = document.createElement('div');
	status.className = 'launcher-status';
	status.textContent = app.running ? '● Running' : 'Launch';

	card.appendChild(icon);
	card.appendChild(title);
	card.appendChild(status);

	// optional action buttons for future dynamic actions
	if (Array.isArray(app.actions) && app.actions.length) {
		const actions = document.createElement('div');
		actions.className = 'launcher-actions';
		app.actions.forEach(a => {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'control-button app-action-button';
			btn.textContent = a.label || a.action;
			btn.onclick = (e) => {
				e.stopPropagation();
				card.dispatchEvent(new CustomEvent('app:action', { detail: { app, action: a } }));
			};
			actions.appendChild(btn);
		});
		card.appendChild(actions);
	}

	return card;
}
