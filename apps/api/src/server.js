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
    notFound: {
      message: "Project not found",
    },
    invalidId: {
      message: "Invalid project id",
    },
  },
};

// project id helpers
function getRawId(request) {
  const parts = request.url.split("/");
  return parts[2];
}

function validateIdPresent(id, response) {
  if (!id) {
    response.statusCode = 404;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(messages.project.notFound));

    return false;
  }

  return true;
}

function validateIdInteger(id, response) {
  if (!Number.isInteger(id) || id <= 0) {
    response.statusCode = 400;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(messages.project.invalidId));

    return false;
  }

  return true;
}

function validateId(id, response) {
  return validateIdPresent(id, response) && validateIdInteger(+id, response);
}

function getProjectId(request, response) {
  const rawId = getRawId(request);

  return validateId(rawId, response) ? +rawId : null;
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
    response.statusCode = 400;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(messages.invalidJSON));

    return null;
  }

  if (!validateProjectData(data)) {
    response.statusCode = 400;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(messages.projects.nameRequired));

    return null;
  }

  return data;
}

// main code
const server = http.createServer(async (request, response) => {
  console.log(`${request.method} ${request.url}`);

  if (request.method === "GET" && request.url === "/") {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(messages.root));

    return;
  }

  if (request.method === "GET" && request.url === "/projects") {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(projects));

    return;
  }

  if (request.method === "GET" && request.url.startsWith("/projects/")) {
    const id = getProjectId(request, response);

    if (id === null) {
      return;
    }

    const projectById = projects.find((project) => project.id === id);

    if (!projectById) {
      response.statusCode = 404;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(messages.project.notFound));

      return;
    }

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(projectById));

    return;
  }

  if (request.method === "DELETE" && request.url.startsWith("/projects/")) {
    const id = getProjectId(request, response);

    if (id === null) {
      return;
    }

    const projectIndex = projects.findIndex((project) => project.id === id);

    if (projectIndex === -1) {
      response.statusCode = 404;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(messages.project.notFound));

      return;
    }

    projects.splice(projectIndex, 1);

    response.statusCode = 204;
    response.end();

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

    response.statusCode = 201;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(newProject));

    return;
  }

  if (request.method === "PATCH" && request.url.startsWith("/projects/")) {
    const id = getProjectId(request, response);

    if (id === null) {
      return;
    }

    const project = projects.find((prj) => prj.id === id);

    if (!project) {
      response.statusCode = 404;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(messages.project.notFound));

      return;
    }

    const data = await getValidatedProjectData(request, response);

    if (data === null) {
      return;
    }

    project.name = data.name.trim();

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(project));

    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(messages.health));

    return;
  }

  response.statusCode = 404;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(messages.notFound));
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
