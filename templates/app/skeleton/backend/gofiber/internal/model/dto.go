package model

import "time"

// TodoResponse is the API representation of a Todo.
type TodoResponse struct {
	ID          uint   `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

// TodoCreateRequest is the payload for creating a new Todo.
type TodoCreateRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// TodoUpdateRequest is the payload for updating an existing Todo.
// Pointer fields allow partial updates — only non-nil fields are applied.
type TodoUpdateRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	Status      *string `json:"status,omitempty"`
}

// ToResponse converts a Todo model to a TodoResponse DTO.
func (t *Todo) ToResponse() TodoResponse {
	return TodoResponse{
		ID:          t.ID,
		Title:       t.Title,
		Description: t.Description,
		Status:      t.Status,
		CreatedAt:   t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   t.UpdatedAt.Format(time.RFC3339),
	}
}
