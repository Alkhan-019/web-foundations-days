let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];
function searchNotes(word) {
    return notes.filter(function(note) {
        return note.text.toLowerCase().includes(word.toLowerCase());
    });
}

console.log(searchNotes("javascript"));
// Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]

console.log(searchNotes("pizza"));
// Expected: []
    function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    return notes.reduce(function(longest, note) {
        if (note.text.length > longest.text.length) {
            return note;
        }

        return longest;
    });
}

console.log(longestNote());
// Expected: the note with the longest text

let originalNotes = notes;
notes = [];

console.log(longestNote());
// Expected: null

notes = originalNotes;
function countByCategory() {
    let counts = {
        personal: 0,
        work: 0,
        study: 0
    };

    notes.forEach(function(note) {
        counts[note.category]++;
    });

    return counts;
}

console.log(countByCategory());
// Expected: { personal: 2, work: 1, study: 2 }

let savedNotes = notes;
notes = [];

console.log(countByCategory());
// Expected: { personal: 0, work: 0, study: 0 }

notes = savedNotes;
function getSummary() {
    let counts = countByCategory();

    return `Personal: ${counts.personal}, Work: ${counts.work}, Study: ${counts.study}`;
}

console.log(getSummary());
// Expected: "Personal: 2, Work: 1, Study: 2"

let savedNotes2 = notes;
notes = [];

console.log(getSummary());
// Expected: "Personal: 0, Work: 0, Study: 0"

notes = savedNotes2;
function isDuplicate(text) {
    return notes.some(function(note) {
        return note.text.trim().toLowerCase() === text.trim().toLowerCase();
    });
}

console.log(isDuplicate("Buy milk and bread"));
// Expected: true

console.log(isDuplicate("  BUY MILK AND BREAD  "));
// Expected: true
function addNote(text, category) {
    text = text.trim();

    if (text.length < 1 || text.length > 200) {
        console.log("Rejected: text must be between 1 and 200 characters.");
        return false;
    }

    if (isDuplicate(text)) {
        console.log("Rejected: duplicate note.");
        return false;
    }

    if (category !== "personal" && category !== "work" && category !== "study") {
        console.log("Rejected: invalid category.");
        return false;
    }

    let newId = 1;

    if (notes.length > 0) {
        newId = Math.max(...notes.map(function(note) {
            return note.id;
        })) + 1;
    }

    notes.push({
        id: newId,
        text: text,
        category: category
    });

    return true;
}

console.log(addNote("Learn JavaScript functions", "study"));
// Expected: true

console.log(addNote("Buy milk and bread", "personal"));
// Expected: false