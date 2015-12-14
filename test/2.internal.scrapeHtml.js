"use strict";
var scrapeHtml = require("../lib/internal/scrapeHtml");
var linkObj    = require("../lib/internal/linkObj");

var tagTests = require("./json/scrapeHtml.json");
var utils    = require("./utils");

var expect = require("chai").expect;
var fs = require("fs");



describe("INTERNAL -- scrapeHtml", function()
{
	it("should support a string", function()
	{
		return scrapeHtml("<html></html>").then( function(links)
		{
			expect(links).to.be.an.instanceOf(Array);
		});
	});
	
	
	
	it("should support a stream", function()
	{
		return scrapeHtml( fs.createReadStream(__dirname+"/fixtures/page-no-links.html") ).then( function(links)
		{
			expect(links).to.be.an.instanceOf(Array);
		});
	});
	
	
	
	describe("link tags & attributes", function()
	{
		for (var test in tagTests)
		{
			var data = tagTests[test];
			var skipOrOnly = data.skipOrOnly==null ? "" : "."+data.skipOrOnly;
			
			var code = "";
			code  = 'it'+skipOrOnly+'("'+utils.addSlashes(test)+'", function()\n';
			code += '{\n';
			code += '	return scrapeHtml("'+utils.addSlashes(data.html)+'").then( function(links)\n';
			code += '	{\n';
			code += '		//links.forEach(linkObj.clean);\n';
			code += '		\n';
			code += '		expect(links).to.have.length('+data.length+');\n';
			code += '		expect(links[0]).to.be.like('+JSON.stringify(data.link, null, "\t")+');\n';
			code += '	});\n';
			code += '});\n';
			
			eval(code);
		}
	});
	
	
	
	describe("edge cases", function()
	{
		it("should support link attributes with values surrounded by spaces", function()
		{
			return scrapeHtml('<a href=" fake.html ">link</a>').then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"fake.html" },
					html: { tag:'<a href=" fake.html ">' }
				});
			});
		});
		
		
		
		it("should support link attributes preceded by non-link attributes", function()
		{
			return scrapeHtml('<a id="link" href="fake.html">link</a>').then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"fake.html" },
					html:
					{
						attrName: "href",
						attrs: { href:"fake.html", id:"link" },
						tag: '<a id="link" href="fake.html">'
					}
				});
			});
		});
		
		
		
		it("should support consecutive link attributes", function()
		{
			return scrapeHtml('<img src="fake.png" longdesc="fake.html"/>').then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(2);
				expect(links).to.be.like(
				[
					{
						url: { original:"fake.png" },
						html:
						{
							selector: "html > body > img:nth-child(1)",
							tagName: "img",
							attrName: "src",
							tag: '<img src="fake.png" longdesc="fake.html">'
						}
					},
					{
						url: { original:"fake.html" },
						html:
						{
							selector: "html > body > img:nth-child(1)",
							tagName: "img",
							attrName: "longdesc",
							tag: '<img src="fake.png" longdesc="fake.html">'
						}
					}
				]);
			});
		});
		
		
		
		it("should ignore redundant link attributes", function()
		{
			return scrapeHtml('<a href="fake.html" href="ignored.html">link</a>').then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links.length).to.equal(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"fake.html" },
					html:
					{
						attrName: "href",
						tag: '<a href="fake.html">'
					}
				});
			});
		});
		
		
		
		it("should support consecutive link elements", function()
		{
			return scrapeHtml('<a href="fake1.html">link1</a> <a href="fake2.html">link2</a>').then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(2);
				expect(links).to.be.like(
				[
					{
						url: { original:"fake1.html" },
						html:
						{
							selector: "html > body > a:nth-child(1)",
							tag: '<a href="fake1.html">',
							text: "link1"
						}
					},
					{
						url: { original:"fake2.html" },
						html:
						{
							selector: "html > body > a:nth-child(2)",
							tag: '<a href="fake2.html">',
							text: "link2"
						}
					}
				]);
			});
		});
		
		
		
		it("should support nonconsecutive link elements", function()
		{
			var html = '<a href="fake1.html">link1</a>';
			html += 'content <span>content</span> content';
			html += '<a href="fake2.html">link2</a>';
			
			return scrapeHtml(html).then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(2);
				expect(links).to.be.like(
				[
					{
						url: { original:"fake1.html" },
						html:
						{
							selector: "html > body > a:nth-child(1)",
							tag: '<a href="fake1.html">',
							text: "link1"
						}
					},
					{
						url: { original:"fake2.html" },
						html:
						{
							selector: "html > body > a:nth-child(3)",
							tag: '<a href="fake2.html">',
							text: "link2"
						}
					}
				]);
			});
		});
		
		
		
		it("should support nested link elements", function()
		{
			return scrapeHtml('<a href="fake1.html"><q cite="fake2.html">quote</q></a>').then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(2);
				expect(links).to.be.like(
				[
					{
						url: { original:"fake1.html" },
						html:
						{
							selector: "html > body > a:nth-child(1)",
							tagName: "a",
							attrName: "href",
							tag: '<a href="fake1.html">',
							text: "quote"
						}
					},
					{
						url: { original:"fake2.html" },
						html:
						{
							selector: "html > body > a:nth-child(1) > q:nth-child(1)",
							tagName: "q",
							attrName: "cite",
							tag: '<q cite="fake2.html">',
							text: "quote"
						}
					}
				]);
			});
		});
		
		
		
		it("should support link elements with nested elements", function()
		{
			return scrapeHtml('<a href="fake.html"><span>text</span></a>').then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"fake.html" },
					html:
					{
						selector: "html > body > a:nth-child(1)",
						tagName: "a",
						attrName: "href",
						tag: '<a href="fake.html">',
						text: "text"
					}
				});
			});
		});
		
		
		
		it("should support void elements", function()
		{
			return scrapeHtml('<img src="fake.png"> content').then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"fake.png" },
					html:
					{
						selector: "html > body > img:nth-child(1)",
						tagName: "img",
						attrName: "src",
						tag: '<img src="fake.png">',
						text: null
					}
				});
			});
		});
		
		
		
		it("should support detailed selectors and omit nth-child from html and body", function()
		{
			var html = '<html><head><title>title</title></head><body>';
			html += '<div><a href="fake1.html">link1</a>';
			html += '<div><a href="fake2.html">link2</a></div>';
			html += '<div><a href="fake3.html">link3</a></div>';
			html += '<a href="fake4.html">link4</a></div>';
			html += '<a href="fake5.html">link5</a>';
			html += '</body></html>';
			
			return scrapeHtml(html).then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(5);
				expect(links).to.be.like(
				[
					{
						url: { original:"fake1.html" },
						html:
						{
							selector: "html > body > div:nth-child(1) > a:nth-child(1)",
							tag: '<a href="fake1.html">',
							text: "link1"
						}
					},
					{
						url: { original:"fake2.html" },
						html:
						{
							selector: "html > body > div:nth-child(1) > div:nth-child(2) > a:nth-child(1)",
							tag: '<a href="fake2.html">',
							text: "link2"
						}
					},
					{
						url: { original:"fake3.html" },
						html:
						{
							selector: "html > body > div:nth-child(1) > div:nth-child(3) > a:nth-child(1)",
							tag: '<a href="fake3.html">',
							text: "link3"
						}
					},
					{
						url: { original:"fake4.html" },
						html:
						{
							selector: "html > body > div:nth-child(1) > a:nth-child(4)",
							tag: '<a href="fake4.html">',
							text: "link4"
						}
					},
					{
						url: { original:"fake5.html" },
						html:
						{
							selector: "html > body > a:nth-child(2)",
							tag: '<a href="fake5.html">',
							text: "link5"
						}
					}
				]);
			});
		});
		
		
		
		it("should support <base/>", function()
		{
			return scrapeHtml('<head><base href="/fake/"/></head> <a href="fake.html">link</a>').then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"fake.html" },
					html: { base:"/fake/" }
				});
			});
		});
		
		
		
		it("should support irregular uses of <base/>", function()
		{
			var html = '<base href="/correct/"/>';
			html += '<a href="fake.html">link</a>';
			
			return scrapeHtml(html).then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"fake.html" },
					html: { base:"/correct/" }
				});
			});
		});
		
		
		
		it("should ignore multiple uses of <base/>", function()
		{
			var html = '<base href="/first/"/>';
			html += '<head><base href="/ignored1/"/><base href="/ignored2/"/></head>';
			html += '<head><base href="/ignored3/"/></head>';
			html += '<base href="/ignored4/"/>';
			html += '<a href="fake.html">link</a>';
			
			return scrapeHtml(html).then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(1);
				expect(links[0]).to.be.like(
				{
					url: { original:"fake.html" },
					html: { base:"/first/" }
				});
			});
		});
		
		
		
		it("should support invalid html structure", function()
		{
			var html = '<html><head><title>title</title></head><body>';
			html += '<table>';
			html += '<p><div><a href="fake1.html">link<b>1</div></a></b>';
			html += '<tr><td>content</td></tr></table>';
			html += '<a href="fake2.html">link2</a>';
			html += '</wtf></body></html>';
			
			return scrapeHtml(html).then( function(links)
			{
				//links.forEach(linkObj.clean);
				
				expect(links).to.have.length(2);
				expect(links).to.be.like(
				[
					{
						url: { original:"fake1.html" },
						html:
						{
							selector: "html > body > div:nth-child(2) > a:nth-child(1)",
							tag: '<a href="fake1.html">',
							text: "link1"
						}
					},
					{
						url: { original:"fake2.html" },
						html:
						{
							selector: "html > body > a:nth-child(4)",
							tag: '<a href="fake2.html">',
							text: "link2"
						}
					}
				]);
			});
		});
		
		
		
		it("should fire \"complete\" when no links found", function()
		{
			return scrapeHtml("no links here").then( function(links)
			{
				expect(links).to.have.length(0);
			});
		});
	});
});
