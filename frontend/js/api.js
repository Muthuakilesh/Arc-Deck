// The Flask app normally serves the UI and API together on port 5000. When
// the optional static server is used (port 8000), send phone requests back to
// the Flask server on the same computer instead of the static server.
const API = window.location.port && window.location.port !== "5000"
    ? `${window.location.protocol}//${window.location.hostname}:5000/api`
    : "/api";



async function request(
endpoint,
options={}
)
{

try
{

const response =
await fetch(
`${API}${endpoint}`,
options
);

const data = await response.json();

if (!response.ok)
{
    console.error("API Error:", data);
    return null;
}

return data;


}

catch(error)
{

console.error(
"API Error:",
error
);


return null;

}


}




export function get(endpoint)
{

return request(endpoint);

}




export function post(endpoint,data)
{

return request(
endpoint,
{

method:"POST",

headers:
{
"Content-Type":
"application/json"
},

body:
JSON.stringify(data)

}

);

}
