
var showdown = require('../../node_modules/showdown');
function showdownParse(md, gh) {
    return (new showdown.converter()).makeHtml(md, gh);
}

var _headingLevel;


exports.parseDoc = function(mdown, headingLevel){
    mdown = normalizeLineBreaks(mdown);
    _headingLevel = (headingLevel || 2);

    var result = parseContent(mdown);

    return {
        toc : result.toc,
        html :  result.html,
        title : getTitle(mdown)
    };
};

exports.parseMdown = function(mdown){
    return showdownParse(mdown);
};


function normalizeLineBreaks(str, lineEnd) {
    lineEnd = lineEnd || '\n';
    return str
        .replace(/\r\n/g, lineEnd) // DOS
        .replace(/\r/g, lineEnd) // Mac
        .replace(/\n/g, lineEnd); // Unix
}

function getHeaderRegExp(level){
    return new RegExp('^'+ getHeaderHashes(level) +'\\s*([^#\\n\\r]+)[# \t]*$', 'gm');
}

function getHeaderHashes(level){
    level = level != null? level : _headingLevel;
    return (new Array(level + 1)).join('#');
}

function getDescription(mdown, fromIndex) {
    var desc = mdown.substr(fromIndex);
    desc = desc.replace(/^\n+/g, '').split(/\n\n/)[0]; //first paragraph

    //check if line starts with a header, hr or code block. fixes #10
    if ((/^(?:(?:[#=]+)|(?:[\-`\=]{3,})|(?: {4,}))/).test(desc)) {
        return null;
    }

    desc = showdownParse(desc.replace(/\n+/, ' '))
                    .replace(/<\/?p>/g, '') //remove paragraphs
                    .replace(/<\/?a[^>]*>/g, ''); //remove links since it breaks layout
    return desc;
}

function parseContent(mdown){
    var toc = [], result = {
        html: '',
        toc: []
    };

    // generate TOC
    var tocIndex = mdown.search( new RegExp('^'+ getHeaderHashes() +'[^#]+', 'm') ), //first header
        pre = mdown.substring(0, tocIndex),
        post = mdown.substring(tocIndex),
        tocContent = getHeaderHashes() +' Table of Contents <a id="toc"></a>\n\n<ul id="toc-list"></ul>\n\n';

    mdown = pre + tocContent + post;
    result.html = showdownParse(mdown);

    // add deep-links
    result.html = result.html.replace(/<(h[2-9]) id="([^"]+)">([^\n]*)<\/(h[2-9])>/g, function(m, header, id, inner, close_header) {
        var title = inner.replace(/<[^>]+>/g, '').trim();

        if (title !== 'Table of Contents') {
            result.toc.push({
                title: title,
                href: '#' + id
            });
        }

        return '<' + header + ' id="' + id + '">' + inner + ' <a href="#' + id + '" class="deep-link">#</a></' + header + '>';
    });

    tocContent = '';
    result.toc.forEach(function(val, i){
        tocContent += '<li><a href="'+ val.href +'">'+ val.title +'</a></li>\n';
    });

    result.html = result.html.replace(/<ul id="toc-list"><\/ul>/g, '<ul id="toc-list">' + tocContent + '</ul>');

    return result;
}


function getTitle(mdown){
    var match = getHeaderRegExp(_headingLevel - 1).exec(mdown); //H1
    return match? match[1].trim() : '';
}
