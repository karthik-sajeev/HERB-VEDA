
$(document).ready(function() {
    $('#reviewForm').on('submit', function(e) {
        e.preventDefault(); // Prevent the default form submission

        // Get form data
        const formData = $(this).serialize();

        $.ajax({
            type: 'POST',
            url: $(this).attr('action'),
            data: formData,
            success: function(response) {
                // Handle success
                alert(response.message);
                
                // Append the new review to the reviews container
                const newReview = `
                    <div class="review">
                        <strong>Rating: ${response.product.reviews[response.product.reviews.length - 1].rating}</strong>
                        <p>${response.product.reviews[response.product.reviews.length - 1].comment}</p>
                    </div>
                `;
                $('#reviewsContainer').append(newReview);
                
                // Clear the form
                $('#reviewForm')[0].reset();
            },
            error: function(xhr) {
                // Handle error
                alert(xhr.responseJSON.message || "Error submitting review");
            }
        });
    });
});
