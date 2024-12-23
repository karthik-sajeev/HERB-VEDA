
document.addEventListener('DOMContentLoaded', function () {
           const toggleButton = document.getElementById('toggleReviews');
           const reviewsDropdown = document.getElementById('reviewsDropdown');

           if (toggleButton && reviewsDropdown) {
               toggleButton.addEventListener('click', function () {
                   reviewsDropdown.classList.toggle('collapse');
                   console.log('Reviews expanded');
               });
           } else {
               console.error('Toggle button or reviews dropdown not found');
           }
       });

          document.addEventListener('DOMContentLoaded', () => {
           const reviewForm = document.getElementById('reviewForm');
           const reviewsList = document.getElementById('reviewsList');

           reviewForm.addEventListener('submit', async (event) => {
               event.preventDefault(); // Prevent the default form submission

               const ratingInput = document.getElementById('ratingInput');
               const commentInput = document.getElementById('commentInput');

               // Get the values from the form
               const rating = Number(ratingInput.value);
               const comment = commentInput.value;

               console.log('Rating Input:', rating); // Debugging line
               console.log('Comment Input:', comment); // Debugging line

               // Validate rating
               if (isNaN(rating) || rating < 1 || rating > 5) {
                   alert('Invalid rating value. Must be a number between 1 and 5.');
                   return;
               }

               // Send review to the server
               try {
                   const response = await fetch(reviewForm.action, {
                       method: 'POST',
                       headers: {
                           'Content-Type': 'application/json'
                       },
                       body: JSON.stringify({ comment, rating })
                   });

                   const data = await response.json();
                   if (!response.ok) {
                       throw new Error(data.message || 'Failed to submit review');
                   }

                   alert('Review submitted successfully!');

                   // Create a new review element and append it to the reviews list
                   const newReviewItem = document.createElement('li');
                   newReviewItem.innerHTML = `<strong>You</strong> - ${rating} stars<p>${comment}</p>`;
                   if (reviewsList) {
                       reviewsList.prepend(newReviewItem); // Add the new review at the top of the list
                   } else {
                       console.error('Reviews list not found.'); // Log an error if not found
                   }

                   // Clear the form inputs after submission
                   reviewForm.reset();

               } catch (error) {
                   console.error('Error submitting review:', error);
                   alert('Error submitting review: ' + error.message);
               }
           });
       });
         $(document).ready(function() {
           const productImage = $('#productImage');
           const zoomedImage = $('#zoomedImage');
   
           // Thumbnail click event
           $('.thumbnail-gallery img').on('click', function() {
               const newSrc = $(this).attr('src');
               
               console.log("Thumbnail clicked:", newSrc); // Log clicked thumbnail source
   
               // Load the clicked image to make sure it is ready for zoom
               let img = new Image();
               img.src = newSrc;
   
               img.onload = function() {
                   productImage.attr('src', newSrc); // Update the main product image
                   $('.thumbnail-gallery img').removeClass('active'); // Remove active class from other thumbnails
                   $(this).addClass('active'); // Add active class to clicked thumbnail
                   zoomedImage.css('background-image', `url(${newSrc})`);
                   zoomedImage.css('background-size', `${img.width * 2}px ${img.height * 2}px`); // Ensure zoom scaling
                   console.log("Image updated and ready for zoom:", newSrc);
               };
   
               img.onerror = function() {
                   console.error("Failed to load image:", newSrc); // Log error if image loading fails
               };
           });
   
           // Zoom effect logic
           productImage.on('mousemove', function(e) {
               const offset = $(this).offset();
               const xPos = e.pageX - offset.left;
               const yPos = e.pageY - offset.top;
   
               zoomedImage.css({
                   display: 'block',
                   left: e.pageX + 10,
                   top: e.pageY + 10,
                   backgroundSize: `${productImage.width() * 2}px ${productImage.height() * 2}px`,
                   backgroundPosition: `${-xPos * 2}px ${-yPos * 2}px` // Adjust based on zoom factor
               });
           });
   
           // Hide zoomed image when leaving the main image
           productImage.on('mouseleave', function() {
               zoomedImage.hide();
           });
       });
       document.getElementById('review-form').addEventListener('submit', function(e) {
   e.preventDefault(); // Prevent default form submission

   const formData = new FormData(this);
   const productId = this.dataset.productId;

   fetch(`/product/${productId}/review`, {
       method: 'POST',
       body: formData,
   })
   .then(response => {
       if (!response.ok) {
           throw new Error('Network response was not ok');
       }
       return response.json();
   })
   .then(data => {
       // Append new review to reviews container
       const reviewsContainer = document.getElementById('reviews-container');
       reviewsContainer.innerHTML += `
           <div>
               <strong>${data.comment}</strong> - ${data.rating} stars
           </div>`;
       // Optionally, update average rating or other UI components
   })
   .catch(error => console.error('Error:', error));
});


