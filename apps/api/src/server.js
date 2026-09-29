const http = require("node:http");

// data
const projects = [
  {
    id: 1,
    name: "TeamSpace",
  },
  {
    id: 2,
    name: "Portfolio",
  },
];

let nextProjectId = 3;

const messages = {
  root: { message: "TeamSpace API" },
  health: { status: "ok" },
  notFound: {
    message: "Not found",
  },
  invalidJSON: { message: "Invalid JSON" },
  projects: {
    nameRequired: {
      message: "Project name is required",
    },
  },
  project: {
    NOT_FOUND: {
      message: "Project not found",
    },
    INVALID_ID: {
      message: "Invalid project id",
    },
  },
};

// general helpers
function sendJSON(response, statusCode, data) {
  response.statusCode = statusCode;

  if (statusCode === 204) {
    response.end();
  } else {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(data));
  }
}

// project id helpers
function parseProjectId(request) {
  const url = new URL(request.url, "http://localhost");
  const parts = url.pathname.split("/");

  if (parts.length !== 3 || parts[1] !== "projects" || !parts[2]) {
    return { id: null, error: "NOT_FOUND" };
  }

  const id = +parts[2];

  if (!Number.isInteger(id) || id <= 0) {
    return { id: null, error: "INVALID_ID" };
  }

  return { id, error: null };
}

// project request body helpers
function validateProjectData(data) {
  if (
    data === null ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.name !== "string" ||
    data.name.trim() === ""
  ) {
    return false;
  }

  return true;
}

function parseRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString();
    });

    request.on("end", () => {
      try {
        const data = JSON.parse(body);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", (error) => {
      reject(error);
    });
  });
}

async function getValidatedProjectData(request, response) {
  let data;

  try {
    data = await parseRequestBody(request);
  } catch (error) {
    sendJSON(response, 400, messages.invalidJSON);

    return null;
  }

  if (!validateProjectData(data)) {
    sendJSON(response, 400, messages.projects.nameRequired);

    return null;
  }

  return data;
}

// main code
const server = http.createServer(async (request, response) => {
  console.log(`${request.method} ${request.url}`);

  if (request.method === "GET" && request.url === "/") {
    sendJSON(response, 200, messages.root);

    return;
  }

  if (request.method === "GET" && request.url === "/projects") {
    sendJSON(response, 200, projects);

    return;
  }

  if (request.method === "GET" && request.url.startsWith("/projects/")) {
    const { id, error } = parseProjectId(request);

    if (error === "INVALID_ID") {
      sendJSON(response, 400, messages.project.INVALID_ID);
      return;
    }

    if (error === "NOT_FOUND") {
      sendJSON(response, 404, messages.project.NOT_FOUND);
      return;
    }

    const projectById = projects.find((project) => project.id === id);

    if (!projectById) {
      sendJSON(response, 404, messages.project.NOT_FOUND);

      return;
    }

    sendJSON(response, 200, projectById);

    return;
  }

  if (request.method === "DELETE" && request.url.startsWith("/projects/")) {
    const { id, error } = parseProjectId(request);

    if (error === "INVALID_ID") {
      sendJSON(response, 400, messages.project.INVALID_ID);
      return;
    }

    if (error === "NOT_FOUND") {
      sendJSON(response, 404, messages.project.NOT_FOUND);
      return;
    }

    const projectIndex = projects.findIndex((project) => project.id === id);

    if (projectIndex === -1) {
      sendJSON(response, 404, messages.project.NOT_FOUND);

      return;
    }

    projects.splice(projectIndex, 1);

    sendJSON(response, 204);

    return;
  }

  if (request.method === "POST" && request.url === "/projects") {
    const data = await getValidatedProjectData(request, response);

    if (data === null) {
      return;
    }

    const newProject = {
      id: nextProjectId,
      name: data.name.trim(),
    };
    projects.push(newProject);

    nextProjectId++;

    sendJSON(response, 201, newProject);

    return;
  }

  if (request.method === "PATCH" && request.url.startsWith("/projects/")) {
    const { id, error } = parseProjectId(request);

    if (error === "INVALID_ID") {
      sendJSON(response, 400, messages.project.INVALID_ID);
      return;
    }

    if (error === "NOT_FOUND") {
      sendJSON(response, 404, messages.project.NOT_FOUND);
      return;
    }

    const project = projects.find((prj) => prj.id === id);

    if (!project) {
      sendJSON(response, 404, messages.project.NOT_FOUND);

      return;
    }

    const data = await getValidatedProjectData(request, response);

    if (data === null) {
      return;
    }

    project.name = data.name.trim();

    sendJSON(response, 200, project);

    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJSON(response, 200, messages.health);

    return;
  }

  sendJSON(response, 404, messages.notFound);
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
