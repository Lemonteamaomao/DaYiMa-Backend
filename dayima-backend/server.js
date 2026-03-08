const BACKEND_URL = "https://dayima-backend.onrender.com";

/* LOAD BOOKINGS */

async function loadBookings() {

  const container = document.getElementById("bookingsList");
  if (!container) return;

  try {

    const response = await fetch(`${BACKEND_URL}/api/bookings`);

    const bookings = await response.json();

    container.innerHTML = "";

    if (bookings.length === 0) {

      container.innerHTML = "<p>No bookings yet.</p>";
      return;

    }

    bookings.forEach((b) => {

      const div = document.createElement("div");

      div.innerHTML = `
        <h3>${b.organization}</h3>
        <p><strong>Workshop:</strong> ${b.workshopType}</p>
        <p><strong>Contact:</strong> ${b.contactPerson}</p>
        <p><strong>Email:</strong> ${b.email}</p>
        <p><strong>Date:</strong> ${b.preferredDate}</p>
        <p><strong>Participants:</strong> ${b.participants}</p>

        <button onclick="cancelBooking('${b._id}')">
        Delete
        </button>

        <hr>
      `;

      container.appendChild(div);

    });

  } catch (err) {

    console.error(err);

    container.innerHTML =
      "<p style='color:red'>Cannot connect to backend.</p>";

  }
}

/* DELETE BOOKING */

async function cancelBooking(id) {

  if (!confirm("Delete this booking?")) return;

  await fetch(`${BACKEND_URL}/api/book-hygiene/${id}`, {
    method: "DELETE"
  });

  loadBookings();

}

/* FORM SUBMIT */

const hygieneForm = document.getElementById("hygieneForm");

if (hygieneForm) {

  hygieneForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const formData = {

      workshopType: document.getElementById("workshopType").value,
      organization: document.getElementById("organization").value,
      contactPerson: document.getElementById("contactPerson").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      preferredDate: document.getElementById("date").value,
      participants: document.getElementById("participants").value,
      message: document.getElementById("notes").value

    };

    try {

      const res = await fetch(`${BACKEND_URL}/api/book-hygiene`, {

        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)

      });

      if (!res.ok) throw new Error();

      alert("Booking submitted!");

      hygieneForm.reset();

      loadBookings();

    } catch {

      alert("Could not connect to backend.");

    }

  });

}

/* INITIALIZE */

document.addEventListener("DOMContentLoaded", loadBookings);
