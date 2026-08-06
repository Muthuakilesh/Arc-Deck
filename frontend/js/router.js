const routes = {};
let currentPage = null;

function register(name, component)
{
	routes[name] = component;
}

function setActiveNav(name)
{
	document.querySelectorAll('.dock-item').forEach(button =>
	{
		button.classList.toggle('active', button.dataset.page === name);
	});
}

function navigate(name)
{
	const container = document.getElementById("app-view");
	const page = routes[name];

	if (!page || !container)
		return;

	currentPage = name;
	container.innerHTML = "";

	const element = page();
	element.classList.add("page-enter");
	container.appendChild(element);

	setActiveNav(name);
}

export default
{
	register,
	navigate,
	setActiveNav,
	get current()
	{
		return currentPage;
	}
};