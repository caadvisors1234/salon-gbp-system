from app.scrapers.text_transform import hotpepper_blog_to_gbp, instagram_caption_to_gbp


def test_hotpepper_blog_to_gbp_truncates_and_adds_footer():
    html = "<div><p>line1</p><p>" + ("x" * 5000) + "</p><img src='https://example.com/a.jpg'></div>"
    summary, img = hotpepper_blog_to_gbp(title="T", body_html=html, article_url="https://example.com/post")
    assert len(summary) <= 1500
    assert "▼ 詳しくはこちら" in summary
    assert "https://example.com/post" in summary
    assert img == "https://example.com/a.jpg"


def test_hotpepper_blog_to_gbp_makes_img_src_absolute():
    html = "<div><p>hi</p><img src='/img/a.jpg'></div>"
    _, img = hotpepper_blog_to_gbp(title="T", body_html=html, article_url="https://example.com/post")
    assert img == "https://example.com/img/a.jpg"


def test_instagram_caption_to_gbp_strips_hashtags_only():
    summary = instagram_caption_to_gbp(
        caption="hello #tag world",
        permalink="https://instagram.com/p/xyz",
        sync_hashtags=False,
    )
    assert "hello world" in summary
    assert "#tag" not in summary
    assert "https://instagram.com/p/xyz" in summary


def test_instagram_caption_to_gbp_keeps_hashtags_when_syncing():
    summary = instagram_caption_to_gbp(
        caption="hello #tag world",
        permalink="https://instagram.com/p/xyz",
        sync_hashtags=True,
    )
    assert "hello #tag world" in summary
