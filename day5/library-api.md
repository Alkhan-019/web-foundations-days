# Library Books REST API Design

## Overview

This REST API allows users to manage books in a library.
The resource is called `books`, and the API uses JSON for request
and response data.

Base URL: `/api/books`

## Endpoints

### 1. List All Books

- **Method:** GET
- **Path:** `/api/books`
- **Description:** Retrieves a list of all books in the library.
- **Success Status Code:** 200 OK
- **Example Request Body:** None required.

### 2. Get a Single Book

- **Method:** GET
- **Path:** `/api/books/{id}`
- **Description:** Retrieves a single book using its unique ID.
- **Success Status Code:** 200 OK
- **Example Request Body:** None required.

### 3. Create a Book

- **Method:** POST
- **Path:** `/api/books`
- **Description:** Adds a new book to the library.
- **Success Status Code:** 201 Created
- **Example Request Body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958,
  "genre": "Novel"
}
```

### 4. Update a Book

- **Method:** PUT
- **Path:** `/api/books/{id}`
- **Description:** Updates an existing book using its unique ID.
- **Success Status Code:** 200 OK
- **Example Request Body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958,
  "genre": "African Literature"
}
```

### 5. Delete a Book

- **Method:** DELETE
- **Path:** `/api/books/{id}`
- **Description:** Deletes a book from the library using its unique ID.
- **Success Status Code:** 204 No Content
- **Example Request Body:** None required.

### 6. List Books by Author

- **Method:** GET
- **Path:** `/api/books?author=Chinua%20Achebe`
- **Description:** Retrieves books written by the specified author.
- **Success Status Code:** 200 OK
- **Example Request Body:** None required.

## Error Responses

### 400 Bad Request

- **Description:** The request contains invalid data or missing required fields.
- **Example:** Creating a book without a title or author.

### 404 Not Found

- **Description:** The requested resource does not exist.
- **Example:** Requesting `/api/books/999` when book ID 999 does not exist.

## Summary

The API provides six endpoints for listing, retrieving, creating,
updating, deleting, and filtering books by author. It uses standard
HTTP methods and status codes to communicate the results of requests.
