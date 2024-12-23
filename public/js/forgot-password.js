document.getElementById('forgotPasswordForm').addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent the form from submitting normally
    
    const email = this.email.value;
    const messageDiv = document.getElementById('message');

    fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            messageDiv.innerHTML = `<p style="color: green;">${data.message}</p>`;
        } else {
            messageDiv.innerHTML = `<p style="color: red;">${data.message}</p>`;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        messageDiv.innerHTML = '<p style="color: red;">An error occurred. Please try again.</p>';
    });
});
