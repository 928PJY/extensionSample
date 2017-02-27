$(function () {
    setInterval(function () {
        $.get("http://localhost:4001" + "/previewContent")
            .done(function (data) {
                if (data[0] == 'T') {
                    // Markdown file does't change, do nothing
                } else {
                    $("article.content").html(data.substring(1));
                    previewrefresh();
                    
                    // var bodyEle = $("body").html();
                    // $("body").html(data.substring(1));

                    // var references = $("script");
                    // //var previousEle = $("script[src$='docfx.js']").prev();
                    // var nextEle = $("script[src$='docfx.js']").next();
                    // if(!nextEle.is('script')){
                    //     nextEle = references.first();
                    // }
                    // $("script[src$='docfx.js']").remove()
                    // nextEle.after($('<script>').attr('type', 'text/javascript').attr('src', 'e:\\SeedProject\\docfx-seed\\_site\\styles\\docfx.js'));
                    //references.last().after($('<script>').attr('type', 'text/javascript').attr('src', 'e:\\SeedProject\\docfx-seed\\_site\\styles\\docfx.js'));
                    //docfxprocess();
                }
            })
    }, 500);
})