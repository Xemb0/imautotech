(function () {
    const cats = $('[data-term-id]');
    const cachedIds = [];
    cats.each(function(){
        let id = $(this).data('term-id');
        getPostsbyCategory(id);
    });

   $('a[data-term-id]').click(function(){
        let id = $(this).data('term-id');
        var $slider = $('[data-term-cont="' + id + '"]');
        if(cachedIds.includes(id)) {
            return;
        }
       cachedIds.push(id);
       $slider.trigger('refresh.owl.carousel');

    });
})();

function getPostsbyCategory(id) {
    $.ajax({
        type: "POST",
        url: '/wp-admin/admin-ajax.php',
        data: {
            action: 'load_posts_by_terms',
            method: 'POST',
            id:     id
        },
        success: function(response){
            $('[data-term-cont="' + id + '"]').html(response.posts);

            var $slider = $('[data-term-cont="' + id + '"]');

            if ($slider.length) {
                $slider.owlCarousel({
                loop: true,
                dots: false,
                nav: true,
                margin: 40,
                responsiveClass:true,
                navText: [
                    '',
                    ''
                ],
                responsive:{
                    0: {
                    items: 1,
                    },
                    768: {
                    items: 2,
                    },
                    1280: {
                    items: 3,
                    }
                }
                });
            }
        }
    });
}