from app.models.salon import Salon


def test_salon_users_relationship_does_not_cascade_deletes():
    cascade = Salon.users.property.cascade
    assert cascade.delete is False
    assert cascade.delete_orphan is False
