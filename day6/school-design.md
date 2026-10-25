# School Database Design

## 1. Tables and Entities

### Students Table

The `students` table stores information about students. It contains a student ID, name, and email address. The student ID is the primary key, and the email address is unique and cannot be empty.

### Courses Table

The `courses` table stores information about courses offered by the school. It contains a course ID, course name, and description. The course ID is the primary key, and the course name is required.

### Enrolments Table

The `enrolments` table records which students are enrolled in which courses. It contains an enrolment ID, student ID, course ID, and grade. The student ID and course ID are foreign keys referencing the students and courses tables. A unique constraint on the combination of student ID and course ID prevents a student from enrolling in the same course twice.

## 2. Relationships

### One-to-Many Relationships

A student can have many enrolments, but each enrolment belongs to one student. Therefore, students and enrolments have a one-to-many relationship.

A course can have many enrolments, but each enrolment belongs to one course. Therefore, courses and enrolments also have a one-to-many relationship.

### Many-to-Many Relationship

Students and courses have a many-to-many relationship because one student can take several courses, and one course can have several students.

The enrolments table acts as a join table between students and courses. It is necessary because it connects the two tables and stores additional information about each enrolment, such as the student's grade.

## 3. Index

I would add an index on `enrolments(course_id)` to improve the performance of queries that retrieve students enrolled in a particular course and queries that count enrolments per course. This index can make lookups more efficient as the database grows.

## 4. SQL vs NoSQL

I would choose a relational SQL database for this school system. The data has clear relationships between students, courses, and enrolments, and each enrolment must reference valid student and course records. SQL supports primary keys, foreign keys, unique constraints, and structured queries using JOIN and GROUP BY. These features help maintain data integrity and make it easier to generate accurate reports. A NoSQL database could be useful for more flexible or unstructured data, but a relational database such as SQLite is a better fit for this system.
