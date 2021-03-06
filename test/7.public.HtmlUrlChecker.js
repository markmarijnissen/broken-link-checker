"use strict";
var HtmlUrlChecker = require("../lib/public/HtmlUrlChecker");

var utils = require("./utils");

var expect = require("chai").expect;

var conn;



describe("PUBLIC -- HtmlUrlChecker", function()
{
	before( function()
	{
		return utils.startConnection().then( function(connection)
		{
			conn = connection;
		});
	});
	
	
	
	after( function()
	{
		return utils.stopConnection(conn.realPort);
	});
	
	
	
	describe("methods (#1)", function()
	{
		describe("enqueue()", function()
		{
			it("should accept a valid url", function()
			{
				var id = new HtmlUrlChecker( utils.options() ).enqueue(conn.absoluteUrl);
				
				expect(id).to.not.be.an.instanceOf(Error);
			});
			
			
			
			it("should reject an invalid url", function()
			{
				var id = new HtmlUrlChecker( utils.options() ).enqueue("/path/");
				
				expect(id).to.be.an.instanceOf(Error);
			});
		});
		
		
		
		describe("dequeue()", function()
		{
			it("should accept a valid id", function()
			{
				var instance = new HtmlUrlChecker( utils.options() );
				
				// Prevent first queued item from immediately starting (and thus being auto-dequeued)
				instance.pause();
				
				var id = instance.enqueue( conn.absoluteUrl );
				
				expect(id).to.not.be.an.instanceOf(Error);
				expect( instance.numPages() ).to.equal(1);
				expect( instance.dequeue(id) ).to.be.true;
				expect( instance.numPages() ).to.equal(0);
			});
			
			
			
			it("should reject an invalid id", function()
			{
				var instance = new HtmlUrlChecker( utils.options() );
				
				// Prevent first queued item from immediately starting (and thus being auto-dequeued)
				instance.pause();
				
				var id = instance.enqueue( conn.absoluteUrl );
				
				expect( instance.dequeue(id+1) ).to.be.an.instanceOf(Error);
				expect( instance.numPages() ).to.equal(1);
			});
		});
	});
	
	
	
	describe("handlers", function()
	{
		it("link", function(done)
		{
			var count = 0;
			
			new HtmlUrlChecker( utils.options(),
			{
				link: function(result, customData)
				{
					// HTML has more than one link, so only accept the first
					// to avoid calling `done()` more than once
					if (++count > 1) return;
					
					expect(arguments).to.have.length(2);
					expect(result).to.be.an.instanceOf(Object);
					expect(customData).to.be.undefined;
					done();
				}
			}).enqueue( conn.absoluteUrl+"/fixtures/index.html" );
		});
		
		
		
		it("page", function(done)
		{
			new HtmlUrlChecker( utils.options(),
			{
				page: function(error, pageUrl, customData)
				{
					expect(arguments).to.have.length(3);
					expect(error).to.be.null;
					expect(pageUrl).to.be.a("string");
					expect(customData).to.be.undefined;
					done();
				}
			}).enqueue( conn.absoluteUrl+"/fixtures/index.html" );
		});
		
		
		
		it("end", function(done)
		{
			new HtmlUrlChecker( utils.options(),
			{
				end: function()
				{
					expect(arguments).to.have.length(0);
					done();
				}
			}).enqueue( conn.absoluteUrl+"/fixtures/index.html" );
		});
	});
	
	
	
	describe("methods (#2)", function()
	{
		describe("numActiveLinks()", function()
		{
			it("should work", function(done)
			{
				var htmlCalled = false;
				
				var instance = new HtmlUrlChecker( utils.options(),
				{
					html: function(pageUrl, customData)	// undocumented event
					{
						expect(pageUrl).to.be.a("string");
						
						// Give time for link checks to start
						setImmediate( function()
						{
							expect( instance.numActiveLinks() ).to.equal(2);
							htmlCalled = true;
						});
					},
					end: function()
					{
						expect(htmlCalled).to.be.true;
						expect( instance.numActiveLinks() ).to.equal(0);
						done();
					}
				});
				
				instance.enqueue( conn.absoluteUrl+"/fixtures/index.html" );
				
				expect( instance.numActiveLinks() ).to.equal(0);
			});
		});
		
		
		
		describe("numQueuedLinks()", function()
		{
			it.skip("should work", function(done)
			{
				done();
			});
		});
	});
	
	
	
	describe("edge cases", function()
	{
		it("should support custom data", function(done)
		{
			var linkCalled = false;
			var pageCalled = false;
			
			new HtmlUrlChecker( utils.options(),
			{
				link: function(result, customData)
				{
					expect(customData).to.be.an.instanceOf(Object);
					expect(customData.test).to.equal("value");
					linkCalled = true;
				},
				page: function(error, pageUrl, customData)
				{
					expect(customData).to.be.an.instanceOf(Object);
					expect(customData.test).to.equal("value");
					pageCalled = true;
				},
				end: function()
				{
					expect(linkCalled).to.be.true;
					expect(pageCalled).to.be.true;
					done();
				}
			}).enqueue( conn.absoluteUrl+"/fixtures/index.html", {test:"value"} );
		});
		
		
		
		it("should support multiple queue items", function(done)
		{
			var results = [];
			
			var instance = new HtmlUrlChecker( utils.options(),
			{
				link: function(result, customData)
				{
					if (results[ customData.index ] === undefined)
					{
						results[ customData.index ] = [];
					}
					
					results[ customData.index ][ result.html.index ] = result;
				},
				end: function()
				{
					expect(results).to.have.length(2);
					
					expect(results[0]).to.have.length(2);
					expect(results[0][0].broken).to.be.false;  // page-with-links.html
					expect(results[0][1].broken).to.be.true;   // page-fake.html
					
					expect(results[1]).to.have.length(2);
					expect(results[1][0].broken).to.be.false;  // page-with-links.html
					expect(results[1][1].broken).to.be.true;   // page-fake.html
					
					done();
				}
			});
			
			instance.enqueue( conn.absoluteUrl+"/fixtures/index.html", {index:0} );
			instance.enqueue( conn.absoluteUrl+"/fixtures/index.html", {index:1} );
		});
		
		
		
		it("should support html with no links", function(done)
		{
			var count = 0;
			var pageCalled = false;
			
			new HtmlUrlChecker( utils.options(),
			{
				link: function()
				{
					count++;
				},
				page: function()
				{
					pageCalled = true;
				},
				end: function()
				{
					expect(pageCalled).to.be.true;
					expect(count).to.equal(0);
					done();
				}
			}).enqueue( conn.absoluteUrl+"/fixtures/page-no-links.html" );
		});
		
		
		
		it("should support pages after html with no links", function(done)
		{
			var linkCount = 0;
			var pageCount = 0;
			
			var instance = new HtmlUrlChecker( utils.options(),
			{
				link: function()
				{
					linkCount++;
				},
				page: function()
				{
					pageCount++;
				},
				end: function()
				{
					expect(linkCount).to.equal(2);
					expect(pageCount).to.equal(2);
					done();
				}
			});

			instance.enqueue( conn.absoluteUrl+"/fixtures/page-no-links.html" );
			instance.enqueue( conn.absoluteUrl+"/fixtures/index.html" );
		});
		
		
		
		it("should report error when html could not be retrieved", function(done)
		{
			var pageCalled = false;
			
			new HtmlUrlChecker( utils.options(),
			{
				page: function(error, pageUrl, customData)
				{
					expect(error).to.be.an.instanceOf(Error);
					expect(pageUrl).to.be.a("string");
					pageCalled = true;
				},
				end: function()
				{
					expect(pageCalled).to.be.true;
					done();
				}
			}).enqueue( conn.absoluteUrl+"/fixtures/page-fake.html" );
		});
	});
});
