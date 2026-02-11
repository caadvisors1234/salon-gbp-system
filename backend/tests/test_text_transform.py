from app.scrapers.text_transform import hotpepper_blog_to_gbp, instagram_caption_to_gbp, sanitize_event_title


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


# --- sanitize_event_title tests ---


def test_sanitize_event_title_removes_newlines():
    result = sanitize_event_title("学割U24\n[全員]\n¥12,990")
    assert "\n" not in result
    assert result == "学割U24 [全員] ¥12,990"


def test_sanitize_event_title_truncates_to_58():
    long_title = "あ" * 100
    result = sanitize_event_title(long_title)
    assert len(result) == 58


def test_sanitize_event_title_compresses_whitespace():
    result = sanitize_event_title("hello   world\t\ttab\n\nnewline")
    assert result == "hello world tab newline"


def test_sanitize_event_title_strips():
    result = sanitize_event_title("  hello  ")
    assert result == "hello"


def test_sanitize_event_title_custom_max_length():
    result = sanitize_event_title("abcdefghij", max_length=5)
    assert result == "abcde"


def test_sanitize_event_title_empty():
    result = sanitize_event_title("")
    assert result == ""


def test_sanitize_event_title_exact_58():
    title = "a" * 58
    result = sanitize_event_title(title)
    assert result == title
    assert len(result) == 58
